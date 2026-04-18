import HavokPhysics from "@babylonjs/havok";
import {
  AbstractMesh,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HavokPlugin,
  HemisphericLight,
  Matrix,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  Vector4
} from "@babylonjs/core";
import { loadAssetRegistry, type AssetEntry, type AssetRegistry } from "./asset-registry";
import { attachAuthoredVisualToProxy } from "./authored-asset-visual";
import type {
  SpawnCandidate,
  SliceChunk,
  SliceManifest,
  SliceRoad,
  SliceWorldEntry
} from "../../world/chunks/slice-manifest";
import { resolveSceneVisualPalette } from "../../world/chunks/scene-visual-palette";
import { createOnFootCamera, type OnFootCamera } from "../../sandbox/on-foot/create-on-foot-camera";
import {
  createPlayerPossessionRuntime,
  type PlayerPossessionRuntime
} from "../../sandbox/on-foot/player-possession-runtime";
import { isVehicleHijackInteractionAllowed } from "../../sandbox/on-foot/vehicle-interaction-policy";
import { createWorldSceneRuntimeError } from "../../world/generation/world-load-failure";
import {
  createHijackableVehicleSpawns,
  type HijackableVehicleSpawn
} from "./hijackable-vehicle-spawns";
import { createStarterVehicleCamera } from "../../vehicles/cameras/create-starter-vehicle-camera";
import {
  createPlayerVehicleController,
  type PlayerInputFrame,
  type PlayerVehicleController
} from "../../vehicles/controllers/player-vehicle-controller";
import {
  createManagedVehicleRuntime,
  createVehicleManager,
  type ManagedVehicleRuntime,
  type VehicleManager
} from "../../vehicles/physics/vehicle-manager";
import { createVehicleFactory, loadTuningProfile } from "../../vehicles/physics/vehicle-factory";
import {
  canSwitchControlledVehicle,
  createWorldNavigationRoadSnapshots,
  createWorldNavigationSnapshot,
  sanitizeWorldRuntimeInputFrame,
  syncWorldSceneTelemetry,
  type WorldNavigationSnapshot,
  type WorldPerformanceTelemetry
} from "./world-scene-runtime";
import { createTrafficSystem, type TrafficSystem } from "../../traffic/runtime/traffic-system";
import {
  applyPedestrianSceneTelemetry,
  createScenePedestrianSystem,
  disposeScenePedestrianSystem,
  updateScenePedestrians
} from "./pedestrian-scene-runtime";
import {
  applyCombatSceneTelemetry,
  createSceneCombatRuntime,
  disposeSceneCombatRuntime,
  updateSceneCombat,
  type SceneCombatRuntime
} from "./combat-scene-runtime";
import {
  applyChaosSceneTelemetry,
  createSceneChaosRuntime,
  disposeSceneChaosRuntime,
  updateSceneChaos
} from "./chaos-scene-runtime";
import {
  applyHeatSceneTelemetry,
  createSceneHeatRuntime,
  disposeSceneHeatRuntime,
  updateSceneHeat
} from "./heat-scene-runtime";
import {
  createSceneResponderRuntime,
  disposeSceneResponderRuntime,
  type SceneResponderRuntime
} from "./responder-scene-runtime";
import {
  REPLAY_VEHICLE_TYPES,
  type ReplaySelection,
  type ReplayStarterVehicleType
} from "../../app/config/replay-options";
import {
  resolveBrowserSupportSnapshot,
  type BrowserFamily,
  type BrowserSupportSnapshot
} from "../../app/config/platform";
import { createSceneBrowserSupportTelemetry } from "../../app/config/browser-support-telemetry";
import type { GraphicsPreset, PlayerSettings } from "../../app/config/settings-schema";
import type { HeatEvent, HeatRuntimeSnapshot } from "../../sandbox/heat/heat-runtime";
import {
  createRunOutcomeRuntime,
  type RunOutcomeEvent,
  type RunOutcomeSnapshot
} from "../../sandbox/reset/run-outcome-runtime";

const AVAILABLE_VEHICLE_TYPES = REPLAY_VEHICLE_TYPES;
const DEFAULT_VEHICLE_TYPE = AVAILABLE_VEHICLE_TYPES[0];
const CHUNK_RESIDENCY_LOOKAHEAD_METERS = 96;
const CHUNK_RESIDENCY_PADDING_METERS = 32;
const PERFORMANCE_TELEMETRY_SAMPLE_WINDOW = 120;
const PERFORMANCE_TELEMETRY_UPDATE_INTERVAL = 15;
const SCENE_TELEMETRY_UPDATE_INTERVAL = 2;

const SCENE_BROWSER_GRAPHICS_ADJUSTMENTS: Record<BrowserFamily, { hardwareScalingMultiplier: number; lightIntensityMultiplier: number }> = {
  chromium: {
    hardwareScalingMultiplier: 1,
    lightIntensityMultiplier: 1
  },
  firefox: {
    hardwareScalingMultiplier: 1.1,
    lightIntensityMultiplier: 0.97
  },
  unknown: {
    hardwareScalingMultiplier: 1,
    lightIntensityMultiplier: 1
  },
  webkit: {
    hardwareScalingMultiplier: 1.2,
    lightIntensityMultiplier: 0.94
  }
};

function getFrameTimePercentile(sortedFrameTimes: number[], percentile: number): number {
  if (sortedFrameTimes.length === 0) {
    return 0;
  }

  const percentileIndex = Math.min(
    sortedFrameTimes.length - 1,
    Math.max(0, Math.ceil(sortedFrameTimes.length * percentile) - 1)
  );

  return sortedFrameTimes[percentileIndex] ?? 0;
}

function roundSceneProfileValue(value: number, decimals: number = 2): number {
  const precision = 10 ** decimals;

  return Math.round(value * precision) / precision;
}

const SCENE_GRAPHICS_PRESET_PROFILES = {
  low: {
    boundaryAlpha: 0.18,
    fillLightIntensity: 0.12,
    fogDensity: 0,
    graphicsPreset: "low",
    hardwareScalingLevel: 1.5,
    lightIntensity: 0.82
  },
  medium: {
    boundaryAlpha: 0.24,
    fillLightIntensity: 0.18,
    fogDensity: 0.0009,
    graphicsPreset: "medium",
    hardwareScalingLevel: 1.25,
    lightIntensity: 0.95
  },
  high: {
    boundaryAlpha: 0.3,
    fillLightIntensity: 0.24,
    fogDensity: 0.0014,
    graphicsPreset: "high",
    hardwareScalingLevel: 1,
    lightIntensity: 1.05
  }
} as const;

export interface SceneGraphicsPresetProfile {
  boundaryAlpha: number;
  fillLightIntensity: number;
  fogDensity: number;
  graphicsPreset: GraphicsPreset;
  hardwareScalingLevel: number;
  lightIntensity: number;
}

export interface ChunkResidencyCandidate {
  id: string;
  origin: Pick<SliceChunk["origin"], "x" | "z">;
  size: SliceChunk["size"];
}

function isPointInsideChunk(
  chunk: ChunkResidencyCandidate,
  point: { x: number; z: number },
  paddingMeters: number
): boolean {
  return (
    point.x >= chunk.origin.x - paddingMeters &&
    point.x <= chunk.origin.x + chunk.size.width + paddingMeters &&
    point.z >= chunk.origin.z - paddingMeters &&
    point.z <= chunk.origin.z + chunk.size.depth + paddingMeters
  );
}

function getNearestChunkId(
  chunks: ChunkResidencyCandidate[],
  position: { x: number; z: number }
): string | null {
  let nearestChunkId: string | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const chunk of chunks) {
    const clampedX = Math.min(Math.max(position.x, chunk.origin.x), chunk.origin.x + chunk.size.width);
    const clampedZ = Math.min(Math.max(position.z, chunk.origin.z), chunk.origin.z + chunk.size.depth);
    const deltaX = position.x - clampedX;
    const deltaZ = position.z - clampedZ;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    if (distanceSquared < nearestDistanceSquared) {
      nearestChunkId = chunk.id;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearestChunkId;
}

export function resolveResidentChunkIds(
  chunks: ChunkResidencyCandidate[],
  options: {
    facingYaw: number;
    lookAheadMeters?: number;
    paddingMeters?: number;
    position: { x: number; z: number };
  }
): string[] {
  const lookAheadMeters = options.lookAheadMeters ?? CHUNK_RESIDENCY_LOOKAHEAD_METERS;
  const paddingMeters = options.paddingMeters ?? CHUNK_RESIDENCY_PADDING_METERS;
  const lookAheadPoint = {
    x: options.position.x + Math.sin(options.facingYaw) * lookAheadMeters,
    z: options.position.z + Math.cos(options.facingYaw) * lookAheadMeters
  };
  const residentChunkIds = chunks
    .filter(
      (chunk) =>
        isPointInsideChunk(chunk, options.position, paddingMeters) ||
        isPointInsideChunk(chunk, lookAheadPoint, paddingMeters)
    )
    .map((chunk) => chunk.id);

  if (residentChunkIds.length > 0) {
    return residentChunkIds;
  }

  const nearestChunkId = getNearestChunkId(chunks, options.position);

  return nearestChunkId === null ? [] : [nearestChunkId];
}

export function resolveSceneStarterVehicleType(
  starterVehicleType?: ReplayStarterVehicleType | null
): ReplayStarterVehicleType {
  return starterVehicleType ?? DEFAULT_VEHICLE_TYPE;
}

export function resolveSceneGraphicsPresetProfile(
  graphicsPreset: GraphicsPreset,
  browserFamily: BrowserFamily = "unknown"
): SceneGraphicsPresetProfile {
  const baseProfile = SCENE_GRAPHICS_PRESET_PROFILES[graphicsPreset];
  const browserAdjustment = SCENE_BROWSER_GRAPHICS_ADJUSTMENTS[browserFamily];

  return {
    boundaryAlpha: baseProfile.boundaryAlpha,
    fillLightIntensity: roundSceneProfileValue(baseProfile.fillLightIntensity * browserAdjustment.lightIntensityMultiplier),
    fogDensity: roundSceneProfileValue(baseProfile.fogDensity, 4),
    graphicsPreset: baseProfile.graphicsPreset,
    hardwareScalingLevel: roundSceneProfileValue(baseProfile.hardwareScalingLevel * browserAdjustment.hardwareScalingMultiplier),
    lightIntensity: roundSceneProfileValue(baseProfile.lightIntensity * browserAdjustment.lightIntensityMultiplier)
  };
}

export interface WorldSceneHandle {
  canvas: HTMLCanvasElement;
  cycleVehicle?(): Promise<void>;
  dispose(): void;
  getNavigationSnapshot?(): WorldNavigationSnapshot | null;
  subscribeNavigation?(listener: (snapshot: WorldNavigationSnapshot) => void): () => void;
  subscribeCombat?(listener: (options: { activeWeaponId: string; events: any[] }) => void): () => void;
  subscribeHeat?(listener: (options: { events: HeatEvent[]; snapshot: HeatRuntimeSnapshot }) => void): () => void;
  subscribeRunOutcome?(listener: (options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void): () => void;
  switchVehicle?(vehicleType: string): Promise<void>;
}

export interface CreateWorldSceneOptions {
  browserSupport?: BrowserSupportSnapshot;
  renderHost: HTMLElement;
  manifest: SliceManifest;
  replaySelection?: ReplaySelection | null;
  settings: PlayerSettings;
  spawnCandidate: SpawnCandidate;
  starterVehicleType?: ReplayStarterVehicleType;
}

export interface WorldSceneLoader {
  load(options: CreateWorldSceneOptions): Promise<WorldSceneHandle>;
}

export function buildRoadSegments(
  scene: Scene,
  parent: TransformNode,
  road: SliceRoad,
  materials: { road: StandardMaterial; curb: StandardMaterial; intersection: StandardMaterial }
): AbstractMesh[] {
  const segments: AbstractMesh[] = [];
  const curbWidth = 1.0;
  const curbHeightOffset = 0.05;
  const roadSurfaceHeight = 0.9;
  const roadWidth = road.width - curbWidth * 2;

  for (let index = 0; index < road.points.length; index += 1) {
    const point = road.points[index];
    if (!point) continue;

    const intersection = MeshBuilder.CreateCylinder(
      `${road.id}-intersection-${index}`,
      {
        diameter: road.width,
        height: roadSurfaceHeight,
        tessellation: 12
      },
      scene
    );
    intersection.position = new Vector3(point.x, roadSurfaceHeight / 2, point.z);
    intersection.parent = parent;
    intersection.material = materials.intersection;
    intersection.checkCollisions = true;
    segments.push(intersection);
  }

  for (let index = 0; index < road.points.length - 1; index += 1) {
    const start = road.points[index];
    const end = road.points[index + 1];

    if (!start || !end) {
      continue;
    }

    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    const midpoint = new Vector3((start.x + end.x) / 2, roadSurfaceHeight / 2, (start.z + end.z) / 2);
    const rotationY = Math.atan2(deltaX, deltaZ);

    const faceUV = new Array(6).fill(new Vector4(0, 0, 1, 1));
    const textureRepeat = length / 10;
    faceUV[4] = new Vector4(0, 0, 1, textureRepeat);

    const mainSegment = MeshBuilder.CreateBox(
      `${road.id}-segment-${index}`,
      {
        width: roadWidth,
        height: roadSurfaceHeight,
        depth: length,
        faceUV
      },
      scene
    );
    mainSegment.position = midpoint;
    mainSegment.rotation.y = rotationY;
    mainSegment.parent = parent;
    mainSegment.material = materials.road;
    mainSegment.checkCollisions = true;
    segments.push(mainSegment);

    const curbOffset = roadWidth / 2 + curbWidth / 2;
    for (const side of [-1, 1]) {
      const curb = MeshBuilder.CreateBox(
        `${road.id}-curb-${side < 0 ? "left" : "right"}-${index}`,
        {
          width: curbWidth,
          height: roadSurfaceHeight + curbHeightOffset,
          depth: Math.max(0.1, length - road.width)
        },
        scene
      );
      
      const curbLocalPos = new Vector3(curbOffset * side, (roadSurfaceHeight + curbHeightOffset) / 2, 0);
      const curbWorldPos = Vector3.TransformCoordinates(curbLocalPos, Matrix.RotationY(rotationY)).add(new Vector3(midpoint.x, 0, midpoint.z));
      curb.position = curbWorldPos;
      curb.rotation.y = rotationY;
      curb.parent = parent;
      curb.material = materials.curb;
      curb.checkCollisions = true;
      segments.push(curb);
    }
  }

  return segments;
}

export interface ChunkWorldMassingPlanEntry {
  id: string;
  meshName: string;
  kind: SliceWorldEntry["kind"];
  assetId?: string;
  position: SliceWorldEntry["position"];
  dimensions: SliceWorldEntry["dimensions"];
  yawDegrees: number;
  metadata: SliceWorldEntry["metadata"];
}

export function createChunkWorldMassingPlan(
  manifest: Pick<SliceManifest, "worldEntries">,
  chunkId: string
): ChunkWorldMassingPlanEntry[] {
  return manifest.worldEntries
    .filter((entry) => entry.chunkId === chunkId)
    .map((entry) => ({
      id: entry.id,
      meshName: `${chunkId}-world-entry-${entry.id}`,
      kind: entry.kind,
      assetId: entry.assetId,
      position: entry.position,
      dimensions: entry.dimensions,
      yawDegrees: entry.yawDegrees ?? 0,
      metadata: entry.metadata
    }));
}

export async function buildChunkMassing(
  parent: TransformNode,
  manifest: Pick<SliceManifest, "worldEntries">,
  chunkId: string,
  material: StandardMaterial,
  assetRegistry: AssetRegistry
): Promise<AbstractMesh[]> {
  const buildings: AbstractMesh[] = [];
  const scene = material.getScene();
  const authoredVisualLoads: Promise<void>[] = [];
  const massingPlan = createChunkWorldMassingPlan(manifest, chunkId);

  for (const entry of massingPlan) {
    const assetEntry: AssetEntry | undefined = entry.assetId ? assetRegistry.world[entry.assetId] : undefined;
    const uvScaleX = Math.max(1, entry.dimensions.width / 15);
    const uvScaleY = Math.max(1, entry.dimensions.height / 15);
    const uvScaleZ = Math.max(1, entry.dimensions.depth / 15);
    const faceUV = [
      new Vector4(0, 0, uvScaleX, uvScaleY),
      new Vector4(0, 0, uvScaleX, uvScaleY),
      new Vector4(0, 0, uvScaleZ, uvScaleY),
      new Vector4(0, 0, uvScaleZ, uvScaleY),
      new Vector4(0, 0, uvScaleX, uvScaleZ),
      new Vector4(0, 0, uvScaleX, uvScaleZ)
    ];

    const building = MeshBuilder.CreateBox(
      entry.meshName,
      {
        width: entry.dimensions.width,
        depth: entry.dimensions.depth,
        height: entry.dimensions.height,
        faceUV
      },
      scene
    );

    building.position = new Vector3(entry.position.x, entry.position.y + entry.dimensions.height / 2, entry.position.z);
    building.rotation.y = (entry.yawDegrees * Math.PI) / 180;
    building.parent = parent;
    building.material = material;
    building.metadata = {
      worldAssetId: entry.assetId ?? null,
      worldEntryId: entry.id,
      worldEntryKind: entry.kind,
      worldEntryLabel: entry.metadata.displayName
    };
    buildings.push(building);

    if (assetEntry && entry.assetId) {
      authoredVisualLoads.push(
        attachAuthoredVisualToProxy({
          assetId: `world:${entry.assetId}`,
          entry: assetEntry,
          proxyMesh: building,
          scene,
          verticalOffset: -entry.dimensions.height / 2
        }).then(() => undefined)
      );
    }
  }

  await Promise.all(authoredVisualLoads);

  return buildings;
}

function buildBoundaryWalls(
  scene: Scene,
  parent: TransformNode,
  manifest: SliceManifest,
  material: StandardMaterial
): AbstractMesh[] {
  const wallThickness = 4;
  const wallHeight = 6;
  const centerX = (manifest.bounds.minX + manifest.bounds.maxX) / 2;
  const centerZ = (manifest.bounds.minZ + manifest.bounds.maxZ) / 2;
  const width = manifest.bounds.maxX - manifest.bounds.minX;
  const depth = manifest.bounds.maxZ - manifest.bounds.minZ;

  const wallDefinitions = [
    {
      name: "slice-boundary-north",
      width: width + wallThickness * 2,
      depth: wallThickness,
      position: new Vector3(centerX, wallHeight / 2, manifest.bounds.minZ - wallThickness / 2)
    },
    {
      name: "slice-boundary-south",
      width: width + wallThickness * 2,
      depth: wallThickness,
      position: new Vector3(centerX, wallHeight / 2, manifest.bounds.maxZ + wallThickness / 2)
    },
    {
      name: "slice-boundary-west",
      width: wallThickness,
      depth,
      position: new Vector3(manifest.bounds.minX - wallThickness / 2, wallHeight / 2, centerZ)
    },
    {
      name: "slice-boundary-east",
      width: wallThickness,
      depth,
      position: new Vector3(manifest.bounds.maxX + wallThickness / 2, wallHeight / 2, centerZ)
    }
  ];

  return wallDefinitions.map((definition) => {
    const wall = MeshBuilder.CreateBox(
      definition.name,
      {
        width: definition.width,
        depth: definition.depth,
        height: wallHeight
      },
      scene
    );

    wall.position = definition.position;
    wall.parent = parent;
    wall.material = material;
    wall.checkCollisions = true;

    return wall;
  });
}

async function enableStaticPhysics(scene: Scene, meshes: AbstractMesh[]): Promise<PhysicsAggregate[]> {
  const havok = await HavokPhysics();
  const plugin = new HavokPlugin(true, havok);

  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);

  return meshes.map(
    (mesh) =>
      new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        {
          mass: 0,
          friction: 1,
          restitution: 0
        },
        scene
      )
  );
}

function createHijackableSpawnCandidate(
  spawn: HijackableVehicleSpawn,
  starterVehicle: SpawnCandidate["starterVehicle"]
): SpawnCandidate {
  return {
    chunkId: spawn.chunkId,
    headingDegrees: spawn.headingDegrees,
    id: spawn.id,
    laneIndex: 0,
    position: spawn.position,
    roadId: spawn.roadId,
    starterVehicle,
    surface: "road"
  };
}

export class BabylonWorldSceneLoader implements WorldSceneLoader {
  async load(options: CreateWorldSceneOptions): Promise<WorldSceneHandle> {
    const { browserSupport, renderHost, manifest, settings, spawnCandidate, starterVehicleType } = options;
    const initialStarterVehicleType = resolveSceneStarterVehicleType(starterVehicleType);
    const resolvedBrowserSupport = browserSupport ?? resolveBrowserSupportSnapshot();
    const browserSupportTelemetry = createSceneBrowserSupportTelemetry(resolvedBrowserSupport);
    const graphicsProfile = resolveSceneGraphicsPresetProfile(settings.graphicsPreset, resolvedBrowserSupport.browserFamily);
    const visualPalette = resolveSceneVisualPalette(manifest.sceneMetadata);
    const canvas = document.createElement("canvas");
    canvas.className = "world-canvas";
    canvas.setAttribute("aria-label", `${manifest.location.placeName} world view`);
    canvas.tabIndex = 0;
    renderHost.replaceChildren(canvas);

    return new Promise<WorldSceneHandle>((resolve, reject) => {
      const handleContextLost = (event: Event): void => {
        event.preventDefault();
        reject(
          createWorldSceneRuntimeError(
            "WORLD_SCENE_LOAD_FAILED",
            "world-loading",
            "The browser's render context was lost.",
            {
              spawnCandidateId: spawnCandidate.id
            }
          )
        );
      };
      canvas.addEventListener("webglcontextlost", handleContextLost, false);

      const doLoad = async (): Promise<WorldSceneHandle> => {
        const assetRegistry = await loadAssetRegistry();
        const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engine.setHardwareScalingLevel(graphicsProfile.hardwareScalingLevel);
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString(visualPalette.skyColor);
    scene.fogColor = Color3.FromHexString(visualPalette.hazeColor);
    scene.fogDensity = graphicsProfile.fogDensity;
    scene.fogMode = graphicsProfile.fogDensity > 0 ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_NONE;
    let physicsAggregates: PhysicsAggregate[] = [];
    let resize: (() => void) | null = null;

    try {

    const worldRoot = new TransformNode("world-root", scene);
    const staticSurfaceRoot = new TransformNode("static-surface-root", scene);
    staticSurfaceRoot.parent = worldRoot;

    const center = new Vector3(
      (manifest.bounds.minX + manifest.bounds.maxX) / 2,
      0,
      (manifest.bounds.minZ + manifest.bounds.maxZ) / 2
    );
    const width = manifest.bounds.maxX - manifest.bounds.minX;
    const depth = manifest.bounds.maxZ - manifest.bounds.minZ;

    const light = new HemisphericLight("slice-light", new Vector3(0.1, 1, 0.1), scene);
    light.intensity = graphicsProfile.lightIntensity;
    light.groundColor = Color3.FromHexString(visualPalette.groundColor);

    const fillLight = new HemisphericLight("slice-fill-light", new Vector3(-0.4, 0.7, -0.25), scene);
    fillLight.diffuse = Color3.FromHexString(visualPalette.hazeColor);
    fillLight.intensity = graphicsProfile.fillLightIntensity;

    const groundMaterial = new StandardMaterial("slice-ground-material", scene);
    groundMaterial.diffuseColor = Color3.FromHexString(visualPalette.groundColor);
    groundMaterial.specularColor = Color3.Black();

    const roadTexture = new DynamicTexture("road-texture", { width: 256, height: 512 }, scene);
    const ctx = roadTexture.getContext();
    ctx.fillStyle = visualPalette.roadColor;
    ctx.fillRect(0, 0, 256, 512);
    ctx.strokeStyle = "#E0D070";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.setLineDash([40, 40]);
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.stroke();
    roadTexture.update();

    const roadMaterial = new StandardMaterial("slice-road-material", scene);
    roadMaterial.diffuseTexture = roadTexture;
    roadMaterial.specularColor = Color3.Black();

    const curbMaterial = new StandardMaterial("slice-curb-material", scene);
    curbMaterial.diffuseColor = Color3.FromHexString(visualPalette.roadColor).scale(1.2);
    curbMaterial.specularColor = Color3.Black();

    const intersectionMaterial = new StandardMaterial("slice-intersection-material", scene);
    intersectionMaterial.diffuseColor = Color3.FromHexString(visualPalette.roadColor);
    intersectionMaterial.specularColor = Color3.Black();

    const boundaryMaterial = new StandardMaterial("slice-boundary-material", scene);
    boundaryMaterial.diffuseColor = Color3.FromHexString(visualPalette.boundaryColor);
    boundaryMaterial.alpha = graphicsProfile.boundaryAlpha;
    boundaryMaterial.specularColor = Color3.Black();

    const chunkMassingMaterial = new StandardMaterial("chunk-massing-material", scene);
    chunkMassingMaterial.specularColor = Color3.Black();

    const facadeTexture = new DynamicTexture("facade-texture", { width: 512, height: 512 }, scene);
    const facadeCtx = facadeTexture.getContext();
    facadeCtx.fillStyle = visualPalette.chunkColor;
    facadeCtx.fillRect(0, 0, 512, 512);
    facadeCtx.fillStyle = "#AACCFF";
    for (let y = 20; y < 512; y += 60) {
      for (let x = 20; x < 512; x += 40) {
        if (Math.random() > 0.2) facadeCtx.fillRect(x, y, 20, 30);
      }
    }
    facadeTexture.update();
    chunkMassingMaterial.diffuseTexture = facadeTexture;

    const ground = MeshBuilder.CreateGround(
      "slice-ground",
      {
        width,
        height: depth,
        subdivisions: 2
      },
      scene
    );
    ground.position = center;
    ground.parent = staticSurfaceRoot;
    ground.material = groundMaterial;
    ground.checkCollisions = true;

    const staticPhysicsMeshes: AbstractMesh[] = [ground];
    const walkableSurfaceMeshes: AbstractMesh[] = [ground];
    const exitBlockingMeshes = buildBoundaryWalls(scene, staticSurfaceRoot, manifest, boundaryMaterial);
    staticPhysicsMeshes.push(...exitBlockingMeshes);

    const chunkRoots = new Map<string, TransformNode>();
    let residentChunkIds: string[] = [];

    const syncChunkResidencyTelemetry = (): void => {
      if (scene.metadata && typeof scene.metadata === "object") {
        Object.assign(scene.metadata, {
          residentChunkCount: residentChunkIds.length,
          residentChunkIds: [...residentChunkIds]
        });
      }

      canvas.dataset.residentChunkCount = String(residentChunkIds.length);
      canvas.dataset.residentChunkIds = residentChunkIds.join(",");
    };

    const updateChunkResidency = (position: { x: number; z: number }, facingYaw: number): void => {
      const nextResidentChunkIds = resolveResidentChunkIds(manifest.chunks, {
        facingYaw,
        position
      });

      if (
        nextResidentChunkIds.length === residentChunkIds.length &&
        nextResidentChunkIds.every((chunkId, index) => residentChunkIds[index] === chunkId)
      ) {
        return;
      }

      const nextResidentChunkIdSet = new Set(nextResidentChunkIds);

      chunkRoots.forEach((chunkRoot, chunkId) => {
        chunkRoot.setEnabled(nextResidentChunkIdSet.has(chunkId));
      });

      residentChunkIds = nextResidentChunkIds;
      syncChunkResidencyTelemetry();
    };

    for (const chunk of manifest.chunks) {
      const chunkRoot = new TransformNode(`chunk-root-${chunk.id}`, scene);
      chunkRoot.parent = worldRoot;

      const chunkFloor = MeshBuilder.CreateGround(
        `${chunk.id}-ground`,
        {
          width: chunk.size.width - 8,
          height: chunk.size.depth - 8
        },
        scene
      );
      chunkFloor.position = new Vector3(
        chunk.origin.x + chunk.size.width / 2,
        0.02,
        chunk.origin.z + chunk.size.depth / 2
      );
      chunkFloor.parent = chunkRoot;
      chunkFloor.material = groundMaterial;
      staticPhysicsMeshes.push(chunkFloor);
      walkableSurfaceMeshes.push(chunkFloor);

      const propLoads: Promise<void>[] = [];

      manifest.roads
        .filter((road) => chunk.roadIds.includes(road.id))
        .forEach((road) => {
          const roadSegments = buildRoadSegments(scene, chunkRoot, road, { road: roadMaterial, curb: curbMaterial as StandardMaterial, intersection: intersectionMaterial as StandardMaterial });
          staticPhysicsMeshes.push(...roadSegments);
          walkableSurfaceMeshes.push(...roadSegments);

          let accumulatedDistance = 0;
          for (let index = 0; index < road.points.length - 1; index += 1) {
            const start = road.points[index];
            const end = road.points[index + 1];
            if (!start || !end) continue;
            
            const deltaX = end.x - start.x;
            const deltaZ = end.z - start.z;
            const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            const rotationY = Math.atan2(deltaX, deltaZ);
            
            let segmentDistance = 0;
            while (segmentDistance < length) {
              const remaining = length - segmentDistance;
              const step = Math.min(remaining, 60 - accumulatedDistance);
              segmentDistance += step;
              accumulatedDistance += step;
              
              if (accumulatedDistance >= 60) {
                accumulatedDistance = 0;
                
                const ratio = segmentDistance / length;
                const pointX = start.x + deltaX * ratio;
                const pointZ = start.z + deltaZ * ratio;
                
                const lightProxy = MeshBuilder.CreateBox(`${road.id}-light-${index}-${Math.floor(ratio*100)}`, { width: 0.35, height: 2.6, depth: 0.35 }, scene);
                
                const proxyMat = new StandardMaterial(`${lightProxy.name}-mat`, scene);
                proxyMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
                lightProxy.material = proxyMat;
                
                const offset = road.width / 2 + 1.0;
                const localPos = new Vector3(offset, 1.3, 0);
                const spawnPoint = new Vector3(pointX, 0, pointZ);
                lightProxy.position = Vector3.TransformCoordinates(localPos, Matrix.RotationY(rotationY)).add(spawnPoint);
                lightProxy.rotation.y = rotationY;
                lightProxy.parent = chunkRoot;
                
                if (assetRegistry.props["signpost"]) {
                  propLoads.push(
                    attachAuthoredVisualToProxy({
                      assetId: "prop:signpost",
                      entry: assetRegistry.props["signpost"],
                      proxyMesh: lightProxy,
                      scene,
                      verticalOffset: -1.3
                    }).then(() => undefined)
                  );
                }
              }
            }
          }
        });

      await Promise.all(propLoads);

      const chunkMassing = await buildChunkMassing(
        chunkRoot,
        manifest,
        chunk.id,
        chunkMassingMaterial,
        assetRegistry
      );
      staticPhysicsMeshes.push(...chunkMassing);
      exitBlockingMeshes.push(...chunkMassing);

      chunkRoots.set(chunk.id, chunkRoot);
    }

    updateChunkResidency(
      {
        x: spawnCandidate.position.x,
        z: spawnCandidate.position.z
      },
      (spawnCandidate.headingDegrees * Math.PI) / 180
    );

    physicsAggregates = await enableStaticPhysics(scene, staticPhysicsMeshes);
    let controller: PlayerVehicleController;

    try {
      controller = createPlayerVehicleController();
    } catch (error) {
      throw createWorldSceneRuntimeError(
        "STARTER_VEHICLE_POSSESSION_FAILED",
        "vehicle-possession",
        "The starter vehicle could not be controlled.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }

    let vehicleManager: VehicleManager | null = null;
    let hijackableVehicles: ManagedVehicleRuntime[] = [];
    let responderRuntime: SceneResponderRuntime | null = null;
    let trafficSystem: TrafficSystem | null = null;

    try {
      const defaultTuning = await loadTuningProfile(initialStarterVehicleType);
      const activeVehicle = createManagedVehicleRuntime({
        vehicleType: initialStarterVehicleType,
        tuning: defaultTuning,
        runtime: createVehicleFactory({
          scene,
          parent: worldRoot,
          spawnCandidate,
          controller,
          metadata: {
            interactionRole: "active"
          },
          runtimeName: `starter-vehicle-${spawnCandidate.id}`,
          tuning: defaultTuning,
          visualPalette: {
            vehicleAccentColor: visualPalette.vehicleAccentColor
          }
        })
      });

      vehicleManager = createVehicleManager({
        activeVehicle,
        availableVehicleTypes: AVAILABLE_VEHICLE_TYPES,
        loadTuningProfile,
        spawnVehicle: ({ tuning }) =>
          createVehicleFactory({
            scene,
            parent: worldRoot,
            spawnCandidate,
            controller,
             metadata: {
               interactionRole: "active"
             },
             runtimeName: `starter-vehicle-${spawnCandidate.id}`,
             tuning,
             visualPalette: {
               vehicleAccentColor: visualPalette.vehicleAccentColor
             }
         })
       });

      const hijackableSpawns = createHijackableVehicleSpawns(manifest, spawnCandidate);
      hijackableVehicles = await Promise.all(
        hijackableSpawns.map(async (secondarySpawn) => {
          const tuning = await loadTuningProfile(secondarySpawn.vehicleType);

          return createManagedVehicleRuntime({
            vehicleType: secondarySpawn.vehicleType,
            tuning,
            runtime: createVehicleFactory({
              scene,
              parent: worldRoot,
              spawnCandidate: createHijackableSpawnCandidate(secondarySpawn, spawnCandidate.starterVehicle),
              controller,
               metadata: {
                 interactionRole: "hijackable"
               },
               runtimeName: `hijackable-vehicle-${secondarySpawn.id}`,
               tuning,
               visualPalette: {
                 vehicleAccentColor: visualPalette.vehicleAccentColor
               }
             })
           });
        })
      );

      trafficSystem = await createTrafficSystem({
        controller,
        getObstacleVehicles: () =>
          vehicleManager === null
            ? []
            : [
                vehicleManager.getActiveVehicle(),
                ...hijackableVehicles,
                ...(responderRuntime?.getVehicles() ?? [])
              ],
        manifest,
        parent: worldRoot,
        scene,
        spawnCandidate
      });

      controller.bindVehicle(vehicleManager.getActiveVehicle().mesh);
    } catch (error) {
      controller.dispose();
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager?.dispose();
      throw createWorldSceneRuntimeError(
        "STARTER_VEHICLE_SPAWN_FAILED",
        "vehicle-spawning",
        "The starter vehicle could not be spawned.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }

    if (vehicleManager === null) {
      controller.dispose();
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      throw createWorldSceneRuntimeError(
        "STARTER_VEHICLE_SPAWN_FAILED",
        "vehicle-spawning",
        "The starter vehicle could not be spawned.",
        {
          spawnCandidateId: spawnCandidate.id
        }
      );
    }

    let pedestrianSystem = null;

    try {
      pedestrianSystem = createScenePedestrianSystem({
        manifest,
        parent: worldRoot,
        scene
      });
    } catch (error) {
      controller.dispose();
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager.dispose();
      throw error;
    }

    let chaosRuntime: ReturnType<typeof createSceneChaosRuntime>;

    try {
      chaosRuntime = createSceneChaosRuntime({
        assetRegistry,
        manifest,
        parent: worldRoot,
        scene
      });
    } catch (error) {
      controller.dispose();
      disposeScenePedestrianSystem(pedestrianSystem);
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager.dispose();
      throw error;
    }
    let combatRuntime: SceneCombatRuntime;

    try {
      combatRuntime = createSceneCombatRuntime();
    } catch (error) {
      controller.dispose();
      disposeScenePedestrianSystem(pedestrianSystem);
      disposeSceneChaosRuntime(chaosRuntime);
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager.dispose();
      throw createWorldSceneRuntimeError(
        "STARTER_VEHICLE_POSSESSION_FAILED",
        "vehicle-possession",
        "The world combat runtime could not be initialized.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }
    let heatRuntime: ReturnType<typeof createSceneHeatRuntime>;

    try {
      heatRuntime = createSceneHeatRuntime();
    } catch (error) {
      controller.dispose();
      disposeSceneCombatRuntime(combatRuntime);
      disposeScenePedestrianSystem(pedestrianSystem);
      disposeSceneChaosRuntime(chaosRuntime);
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager.dispose();
      throw createWorldSceneRuntimeError(
        "WORLD_SCENE_LOAD_FAILED",
        "world-loading",
        "The world heat runtime could not be initialized.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }
    try {
      responderRuntime = await createSceneResponderRuntime({
        controller,
        manifest,
        parent: worldRoot,
        scene,
        spawnCandidate
      });
    } catch (error) {
      controller.dispose();
      disposeSceneHeatRuntime(heatRuntime);
      disposeSceneCombatRuntime(combatRuntime);
      disposeScenePedestrianSystem(pedestrianSystem);
      disposeSceneChaosRuntime(chaosRuntime);
      trafficSystem?.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      vehicleManager.dispose();
      throw createWorldSceneRuntimeError(
        "WORLD_SCENE_LOAD_FAILED",
        "world-loading",
        "The responder runtime could not be initialized.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }
    let currentInputFrame: PlayerInputFrame = controller.captureInputFrame();
    let recentChaosEvents: ReturnType<typeof updateSceneChaos> = [];
    let recentHeatEvents: ReturnType<typeof updateSceneHeat> = [];
    let recentPedestrianEvents: ReturnType<typeof updateScenePedestrians> = [];
    let worldTimeSeconds = 0;
    const runOutcomeRuntime = createRunOutcomeRuntime();
    const possessionRuntime: PlayerPossessionRuntime = createPlayerPossessionRuntime({
      blockingMeshes: exitBlockingMeshes,
      getInteractableVehicles: () => hijackableVehicles.filter((vehicle) => isVehicleHijackInteractionAllowed(vehicle)),
      parent: worldRoot,
      scene,
      sliceBounds: manifest.bounds,
      surfaceMeshes: walkableSurfaceMeshes
    });

    let camera: ReturnType<typeof createStarterVehicleCamera>;
    let onFootCamera: OnFootCamera | null = null;
    let removeVehicleSwitchListener = (): void => {};
    let vehicleSwitchInFlight = false;
    const spawnPoint = new Vector3(spawnCandidate.position.x, spawnCandidate.position.y, spawnCandidate.position.z);
    let currentActorId: string | null = null;
    let currentRoadId: string | null = null;
    let navigationSnapshot: WorldNavigationSnapshot | null = null;
    const navigationListeners = new Set<(snapshot: WorldNavigationSnapshot) => void>();
    const combatListeners = new Set<(options: { activeWeaponId: string; events: any[] }) => void>();
    const heatListeners = new Set<(options: { events: HeatEvent[]; snapshot: HeatRuntimeSnapshot }) => void>();
    const runOutcomeListeners = new Set<(options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void>();
    const navigationRoadSnapshots = createWorldNavigationRoadSnapshots(manifest.roads);
    const frameTimeSamples: number[] = [];
    const performanceTelemetry: WorldPerformanceTelemetry = {
      activeMeshCount: 0,
      fpsEstimate: 0,
      frameTimeP50Ms: 0,
      frameTimeP95Ms: 0,
      meshCount: scene.meshes.length,
      sampleCount: 0
    };
    const combinedTrafficVehicles: Array<NonNullable<Parameters<typeof updateSceneCombat>[0]["trafficVehicles"]>[number]> = [];
    const sceneTelemetryVehicles: Array<Parameters<typeof applyChaosSceneTelemetry>[0]["vehicles"][number]> = [];
    let frameTimeSampleSumMs = 0;
    let nextFrameTimeSampleIndex = 0;
    let framesSincePerformanceRefresh = PERFORMANCE_TELEMETRY_UPDATE_INTERVAL;
    let framesSinceTelemetrySync = SCENE_TELEMETRY_UPDATE_INTERVAL;

    const recordWorldPerformanceFrame = (frameTimeMs: number): void => {
      if (Number.isFinite(frameTimeMs) && frameTimeMs > 0) {
        const overwrittenSample = frameTimeSamples[nextFrameTimeSampleIndex];

        if (overwrittenSample !== undefined) {
          frameTimeSampleSumMs -= overwrittenSample;
        }

        frameTimeSamples[nextFrameTimeSampleIndex] = frameTimeMs;
        frameTimeSampleSumMs += frameTimeMs;
        nextFrameTimeSampleIndex = (nextFrameTimeSampleIndex + 1) % PERFORMANCE_TELEMETRY_SAMPLE_WINDOW;
      }

      performanceTelemetry.sampleCount = frameTimeSamples.length;

      if (frameTimeSamples.length === 0) {
        return;
      }

      framesSincePerformanceRefresh += 1;

      if (framesSincePerformanceRefresh < PERFORMANCE_TELEMETRY_UPDATE_INTERVAL && performanceTelemetry.sampleCount > 1) {
        return;
      }

      performanceTelemetry.meshCount = scene.meshes.length;
      performanceTelemetry.activeMeshCount = scene.getActiveMeshes().length;

      const sortedFrameTimes = frameTimeSamples.slice().sort((left, right) => left - right);
      const averageFrameTimeMs = frameTimeSampleSumMs / frameTimeSamples.length;

      performanceTelemetry.fpsEstimate = averageFrameTimeMs > 0 ? 1000 / averageFrameTimeMs : 0;
      performanceTelemetry.frameTimeP50Ms = getFrameTimePercentile(sortedFrameTimes, 0.5);
      performanceTelemetry.frameTimeP95Ms = getFrameTimePercentile(sortedFrameTimes, 0.95);
      framesSincePerformanceRefresh = 0;
    };

    function forceSyncCanvasTelemetry(): void {
      syncCanvasTelemetry();
      framesSinceTelemetrySync = 0;
    }

    function maybeSyncCanvasTelemetry(): void {
      framesSinceTelemetrySync += 1;

      if (framesSinceTelemetrySync < SCENE_TELEMETRY_UPDATE_INTERVAL) {
        return;
      }

      forceSyncCanvasTelemetry();
    }

    const completeHijack = (nextVehicle: ManagedVehicleRuntime): void => {
      const previousVehicle = vehicleManager.getActiveVehicle();

      if (previousVehicle === nextVehicle) {
        return;
      }

      hijackableVehicles = hijackableVehicles.filter((vehicle) => vehicle !== nextVehicle);

      if (!hijackableVehicles.includes(previousVehicle)) {
        hijackableVehicles = [...hijackableVehicles, previousVehicle];
      }

      if (previousVehicle.mesh.metadata && typeof previousVehicle.mesh.metadata === "object") {
        Object.assign(previousVehicle.mesh.metadata, {
          interactionRole: "hijackable"
        });
      }

      if (nextVehicle.mesh.metadata && typeof nextVehicle.mesh.metadata === "object") {
        Object.assign(nextVehicle.mesh.metadata, {
          interactionRole: "active"
        });
      }

      vehicleManager.setActiveVehicle(nextVehicle);
      possessionRuntime.bindActiveVehicle(nextVehicle);
      controller.bindVehicle(nextVehicle.mesh);
      camera.setVehicleTarget(nextVehicle.mesh);
      scene.activeCamera = camera;

      if (scene.metadata && typeof scene.metadata === "object") {
        Object.assign(scene.metadata, {
          hijackableVehicleCount: hijackableVehicles.length,
          hijackableVehicleIds: hijackableVehicles.map((vehicle) => vehicle.mesh.name)
        });
      }

      canvas.dataset.hijackableVehicleCount = String(hijackableVehicles.length);
      forceSyncCanvasTelemetry();
    };

    const cycleActiveVehicle = async (): Promise<void> => {
      if (!canSwitchControlledVehicle({ possessionMode: possessionRuntime.getMode(), vehicleSwitchInFlight })) {
        return;
      }

      vehicleSwitchInFlight = true;

      try {
        await vehicleManager.cycleVehicle();
        forceSyncCanvasTelemetry();
      } finally {
        vehicleSwitchInFlight = false;
      }
    };

    const switchActiveVehicle = async (vehicleType: string): Promise<void> => {
      if (!canSwitchControlledVehicle({ possessionMode: possessionRuntime.getMode(), vehicleSwitchInFlight })) {
        return;
      }

      vehicleSwitchInFlight = true;

      try {
        await vehicleManager.switchVehicle(vehicleType);
        forceSyncCanvasTelemetry();
      } finally {
        vehicleSwitchInFlight = false;
      }
    };

    const updateWorldRuntime = (): void => {
      const deltaTimeMs = scene.getEngine().getDeltaTime() || 16;
      worldTimeSeconds += deltaTimeMs / 1000;
      const possessionModeBeforeUpdate = possessionRuntime.getMode();
      const worldInputFrame = sanitizeWorldRuntimeInputFrame(currentInputFrame, {
        possessionMode: possessionModeBeforeUpdate,
        vehicleSwitchInFlight
      });
      const possessionUpdate = possessionRuntime.update(worldInputFrame, deltaTimeMs / 1000);
      const possessionMode = possessionRuntime.getMode();

      if (possessionUpdate.transition === "exited") {
        controller.unbindVehicle();
        const onFootRuntime = possessionRuntime.getOnFootRuntime();

        if (onFootRuntime !== null) {
          if (onFootCamera === null) {
            onFootCamera = createOnFootCamera({ scene, target: onFootRuntime.mesh });
          } else {
            onFootCamera.setTargetActor(onFootRuntime.mesh);
            scene.activeCamera = onFootCamera;
          }
        }
      }

      if (possessionUpdate.transition === "reentered") {
        controller.bindVehicle(vehicleManager.getActiveVehicle().mesh);
        camera.setVehicleTarget(vehicleManager.getActiveVehicle().mesh);
        scene.activeCamera = camera;
      }

      if (possessionUpdate.transition === "hijacked" && possessionUpdate.targetVehicle) {
        completeHijack(possessionUpdate.targetVehicle as ManagedVehicleRuntime);
      }

      if (
        canSwitchControlledVehicle({ possessionMode, vehicleSwitchInFlight }) &&
        worldInputFrame.switchVehicleRequested
      ) {
        void cycleActiveVehicle();
      }

      if (possessionMode === "vehicle") {
        vehicleManager.getActiveVehicle().update(worldInputFrame.vehicleControls);
      } else {
        onFootCamera?.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());
      }

      trafficSystem?.update(deltaTimeMs / 1000);
      const responderUpdate = responderRuntime.update({
        activeVehicle: vehicleManager.getActiveVehicle(),
        deltaSeconds: deltaTimeMs / 1000,
        heatSnapshot: heatRuntime.getSnapshot()
      });
      const trafficVehicles = trafficSystem?.getVehicles() ?? [];
      const responderVehicles = responderRuntime.getVehicles();

      combinedTrafficVehicles.length = 0;
      trafficVehicles.forEach((trafficVehicle) => {
        combinedTrafficVehicles.push(trafficVehicle);
      });
      responderVehicles.forEach((responderVehicle) => {
        combinedTrafficVehicles.push(responderVehicle);
      });

      const combatUpdate = updateSceneCombat({
        activeVehicle: vehicleManager.getActiveVehicle(),
        chaosRuntime,
        combatControls: worldInputFrame.combatControls,
        combatEnabled: possessionUpdate.combatEnabled,
        deltaSeconds: deltaTimeMs / 1000,
        facingYaw: possessionRuntime.getFacingYaw(),
        hijackableVehicles,
        lookPitch: possessionRuntime.getLookPitch(),
        onFootActor: possessionRuntime.getOnFootRuntime(),
        pedestrianSystem,
        runtime: combatRuntime,
        trafficVehicles: combinedTrafficVehicles
      });

      if (combatListeners.size > 0 && combatUpdate.events.length > 0) {
        const combatSnapshot = combatRuntime.getSnapshot();
        combatListeners.forEach((listener) => {
          listener({ activeWeaponId: combatSnapshot.activeWeaponId, events: combatUpdate.events });
        });
      }

      const pedestrianEvents = updateScenePedestrians({
        activeVehicle: vehicleManager.getActiveVehicle(),
        combatHits: combatUpdate.pedestrianCombatHits,
        combatThreats: combatUpdate.pedestrianCombatThreats,
        deltaSeconds: deltaTimeMs / 1000,
        onFootActor: possessionRuntime.getOnFootRuntime(),
        pedestrianSystem
      });
      const chaosEvents = updateSceneChaos({
        activeVehicle: vehicleManager.getActiveVehicle(),
        combatPropHits: combatUpdate.chaosPropHits,
        combatVehicleHits: combatUpdate.chaosVehicleHits,
        deltaSeconds: deltaTimeMs / 1000,
        hijackableVehicles,
        runtime: chaosRuntime,
        trafficVehicles: combinedTrafficVehicles
      });
      const heatEvents = updateSceneHeat({
        chaosEvents,
        combatEvents: combatUpdate.events,
        currentTimeSeconds: worldTimeSeconds,
        pedestrianEvents,
        pursuitContact: responderUpdate.pursuitContact,
        responderCount: responderUpdate.responderCount,
        runtime: heatRuntime
      });
      const runOutcomeEvents = runOutcomeRuntime.update({
        activeVehicleDamage: vehicleManager.getActiveVehicle().damageState,
        currentTimeSeconds: worldTimeSeconds,
        hasRecoveryVehicle:
          possessionRuntime.getStoredVehicle() !== null ||
          hijackableVehicles.length > 0 ||
          vehicleManager.getActiveVehicle().damageState.normalizedSeverity < 1,
        heatSnapshot: heatRuntime.getSnapshot(),
        possessionMode
      });

      if (pedestrianEvents.length > 0) {
        recentPedestrianEvents = pedestrianEvents.slice(-4);
      }

      if (chaosEvents.length > 0) {
        recentChaosEvents = [...recentChaosEvents, ...chaosEvents].slice(-4);
      }

      recentHeatEvents = heatEvents;

      if (heatListeners.size > 0 && heatEvents.length > 0) {
        const heatSnapshot = heatRuntime.getSnapshot();
        heatListeners.forEach((listener) => {
          listener({ events: heatEvents, snapshot: heatSnapshot });
        });
      }

      if (runOutcomeListeners.size > 0 && runOutcomeEvents.length > 0) {
        const runOutcomeSnapshot = runOutcomeRuntime.getSnapshot();
        runOutcomeListeners.forEach((listener) => {
          listener({ events: runOutcomeEvents, snapshot: runOutcomeSnapshot });
        });
      }

      const residencyTarget = possessionMode === "on-foot" && possessionRuntime.getOnFootRuntime() !== null
        ? {
            facingYaw: possessionRuntime.getFacingYaw(),
            position: possessionRuntime.getOnFootRuntime()!.mesh.position
          }
        : {
            facingYaw: vehicleManager.getActiveVehicle().mesh.rotation.y,
            position: vehicleManager.getActiveVehicle().mesh.position
          };

      updateChunkResidency(
        {
          x: residencyTarget.position.x,
          z: residencyTarget.position.z
        },
        residencyTarget.facingYaw
      );
    };

    const syncCanvasTelemetry = (): void => {
      const runOutcomeSnapshot = runOutcomeRuntime.getSnapshot();
      const trafficVehicles = trafficSystem?.getVehicles() ?? [];
      const responderVehicles = responderRuntime.getVehicles();

      syncWorldSceneTelemetry({
        activeVehicle: vehicleManager.getActiveVehicle(),
        canvas,
        fallbackCameraName: camera.name,
        onFootActorId: possessionRuntime.getOnFootRuntime()?.mesh.name,
        performanceTelemetry,
        possessionMode: possessionRuntime.getMode(),
        scene,
        spawnPoint
      });

      if (scene.metadata && typeof scene.metadata === "object") {
        Object.assign(scene.metadata, {
          residentChunkCount: residentChunkIds.length,
          residentChunkIds: [...residentChunkIds],
          settingsGraphicsPreset: settings.graphicsPreset,
          settingsPedestrianDensity: settings.pedestrianDensity,
          settingsTrafficDensity: settings.trafficDensity,
          settingsWorldSize: settings.worldSize,
          runOutcome: runOutcomeSnapshot.outcome,
          runOutcomePhase: runOutcomeSnapshot.phase,
          responderVehicleCount: responderVehicles.length,
          responderVehicleIds: responderVehicles.map((vehicle) => vehicle.mesh.name),
          trafficVehicleCount: trafficVehicles.length,
          trafficVehicleIds: trafficVehicles.map((vehicle) => vehicle.mesh.name)
        });
      }

      canvas.dataset.runOutcome = runOutcomeSnapshot.outcome ?? "none";
      canvas.dataset.runOutcomePhase = runOutcomeSnapshot.phase;
      canvas.dataset.settingsGraphicsPreset = settings.graphicsPreset;
      canvas.dataset.settingsPedestrianDensity = settings.pedestrianDensity;
      canvas.dataset.settingsTrafficDensity = settings.trafficDensity;
      canvas.dataset.settingsWorldSize = settings.worldSize;
      canvas.dataset.residentChunkCount = String(residentChunkIds.length);
      canvas.dataset.residentChunkIds = residentChunkIds.join(",");
      canvas.dataset.responderVehicleCount = String(responderVehicles.length);
      canvas.dataset.trafficVehicleCount = String(trafficVehicles.length);
      applyPedestrianSceneTelemetry({
        canvas,
        events: recentPedestrianEvents,
        pedestrianSystem,
        scene
      });

      sceneTelemetryVehicles.length = 0;
      sceneTelemetryVehicles.push(vehicleManager.getActiveVehicle());
      hijackableVehicles.forEach((vehicle) => {
        sceneTelemetryVehicles.push(vehicle);
      });
      trafficVehicles.forEach((vehicle) => {
        sceneTelemetryVehicles.push(vehicle);
      });
      responderVehicles.forEach((vehicle) => {
        sceneTelemetryVehicles.push(vehicle);
      });

      applyChaosSceneTelemetry({
        canvas,
        events: recentChaosEvents,
        runtime: chaosRuntime,
        scene,
        vehicles: sceneTelemetryVehicles
      });
      applyCombatSceneTelemetry({
        canvas,
        runtime: combatRuntime,
        scene
      });
      applyHeatSceneTelemetry({
        canvas,
        events: recentHeatEvents,
        runtime: heatRuntime,
        scene
      });

      const nextNavigationSnapshot = createWorldNavigationSnapshot({
        activeVehicle: vehicleManager.getActiveVehicle(),
        manifest,
        onFootActor: possessionRuntime.getOnFootRuntime(),
        onFootFacingYaw: possessionRuntime.getFacingYaw(),
        possessionMode: possessionRuntime.getMode(),
        previousActorId: currentActorId ?? undefined,
        previousRoadId: currentRoadId ?? undefined,
        roadSnapshots: navigationRoadSnapshots
      });

      currentActorId = nextNavigationSnapshot.currentActorId;
      currentRoadId = nextNavigationSnapshot.currentRoadId;
      navigationSnapshot = nextNavigationSnapshot.snapshot;
      navigationListeners.forEach((listener) => {
        listener(nextNavigationSnapshot.snapshot);
      });
    };

    try {
      camera = createStarterVehicleCamera({
        scene,
        target: vehicleManager.getActiveVehicle().mesh,
        controller,
        getInputState: () => currentInputFrame.vehicleControls
      });
      possessionRuntime.bindActiveVehicle(vehicleManager.getActiveVehicle());
      removeVehicleSwitchListener = vehicleManager.onVehicleSwitched((event) => {
        possessionRuntime.bindActiveVehicle(event.activeVehicle);
        controller.unbindVehicle();
        controller.bindVehicle(event.activeVehicle.mesh);
        camera.setVehicleTarget(event.activeVehicle.mesh);
        scene.activeCamera = camera;
        forceSyncCanvasTelemetry();
      });
      scene.registerBeforeRender(updateWorldRuntime);
    } catch (error) {
      controller.dispose();
      possessionRuntime.dispose();
      disposeSceneResponderRuntime(responderRuntime);
      disposeSceneHeatRuntime(heatRuntime);
      disposeSceneCombatRuntime(combatRuntime);
      disposeScenePedestrianSystem(pedestrianSystem);
      disposeSceneChaosRuntime(chaosRuntime);
      trafficSystem?.dispose();
      vehicleManager.dispose();
      hijackableVehicles.forEach((vehicle) => vehicle.dispose());
      throw createWorldSceneRuntimeError(
        "STARTER_VEHICLE_POSSESSION_FAILED",
        "vehicle-possession",
        "The starter vehicle could not be controlled.",
        {
          error: error instanceof Error ? error.message : String(error),
          spawnCandidateId: spawnCandidate.id
        }
      );
    }

      scene.metadata = {
        ...browserSupportTelemetry,
        sliceId: manifest.sliceId,
        worldRootName: worldRoot.name,
        staticSurfaceRootName: staticSurfaceRoot.name,
        chunkRootNames: Array.from(chunkRoots.values()).map((chunkRoot) => chunkRoot.name),
        residentChunkCount: residentChunkIds.length,
        residentChunkIds: [...residentChunkIds],
        physicsReady: scene.isPhysicsEnabled(),
        graphicsBoundaryAlpha: graphicsProfile.boundaryAlpha,
        graphicsHardwareScalingLevel: graphicsProfile.hardwareScalingLevel,
        graphicsFillLightIntensity: graphicsProfile.fillLightIntensity,
        graphicsFogDensity: graphicsProfile.fogDensity,
        graphicsLightIntensity: graphicsProfile.lightIntensity,
        graphicsBrowserFamily: resolvedBrowserSupport.browserFamily,
        settingsGraphicsPreset: settings.graphicsPreset,
        settingsPedestrianDensity: settings.pedestrianDensity,
        settingsTrafficDensity: settings.trafficDensity,
        settingsWorldSize: settings.worldSize,
        starterVehicleId: vehicleManager.getActiveVehicle().mesh.name,
        availableVehicleTypes: [...AVAILABLE_VEHICLE_TYPES],
        activeVehicleType: vehicleManager.getActiveVehicle().vehicleType,
        activeCamera: camera.name,
        heatLevel: heatRuntime.getSnapshot().level,
        heatStage: heatRuntime.getSnapshot().stage,
        hijackableVehicleCount: hijackableVehicles.length,
        hijackableVehicleIds: hijackableVehicles.map((vehicle) => vehicle.mesh.name),
        responderVehicleCount: responderRuntime.getVehicles().length,
        responderVehicleIds: responderRuntime.getVehicles().map((vehicle) => vehicle.mesh.name),
        trafficVehicleCount: trafficSystem?.getVehicles().length ?? 0,
        trafficVehicleIds: trafficSystem?.getVehicles().map((vehicle) => vehicle.mesh.name) ?? [],
        visualPaletteChunkColor: visualPalette.chunkColor,
        visualPaletteHazeColor: visualPalette.hazeColor,
        visualPalettePedestrianColor: visualPalette.pedestrianColor,
        visualPaletteRoadColor: visualPalette.roadColor,
        visualPaletteSkyColor: visualPalette.skyColor,
        visualPaletteVehicleAccentColor: visualPalette.vehicleAccentColor,
        readinessMilestone: "controllable-vehicle",
        spawnRoadId: spawnCandidate.roadId,
        spawnChunkId: spawnCandidate.chunkId
      };
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = camera.name;
    canvas.dataset.browserAudioContextAvailable = browserSupportTelemetry.browserAudioContextAvailable;
    canvas.dataset.browserCapabilityDefaultGraphicsPreset = browserSupportTelemetry.browserCapabilityDefaultGraphicsPreset;
    canvas.dataset.browserCapabilityDefaultPedestrianDensity = browserSupportTelemetry.browserCapabilityDefaultPedestrianDensity;
    canvas.dataset.browserCapabilityDefaultTrafficDensity = browserSupportTelemetry.browserCapabilityDefaultTrafficDensity;
    canvas.dataset.browserCapabilityDefaultWorldSize = browserSupportTelemetry.browserCapabilityDefaultWorldSize;
    canvas.dataset.browserFamily = browserSupportTelemetry.browserFamily;
    canvas.dataset.browserLocalStorageAvailable = browserSupportTelemetry.browserLocalStorageAvailable;
    canvas.dataset.browserMutationObserverAvailable = browserSupportTelemetry.browserMutationObserverAvailable;
    canvas.dataset.browserPerformanceNowAvailable = browserSupportTelemetry.browserPerformanceNowAvailable;
    canvas.dataset.browserRequestIdleCallbackAvailable = browserSupportTelemetry.browserRequestIdleCallbackAvailable;
    canvas.dataset.browserSupportIssues = browserSupportTelemetry.browserSupportIssues;
    canvas.dataset.browserSupportTier = browserSupportTelemetry.browserSupportTier;
    canvas.dataset.browserWebgl2Available = browserSupportTelemetry.browserWebgl2Available;
    canvas.dataset.graphicsBoundaryAlpha = graphicsProfile.boundaryAlpha.toFixed(2);
    canvas.dataset.graphicsBrowserFamily = resolvedBrowserSupport.browserFamily;
    canvas.dataset.graphicsFillLightIntensity = graphicsProfile.fillLightIntensity.toFixed(2);
    canvas.dataset.graphicsFogDensity = graphicsProfile.fogDensity.toFixed(4);
    canvas.dataset.graphicsHardwareScalingLevel = graphicsProfile.hardwareScalingLevel.toFixed(2);
    canvas.dataset.graphicsLightIntensity = graphicsProfile.lightIntensity.toFixed(2);
    canvas.dataset.settingsGraphicsPreset = settings.graphicsPreset;
    canvas.dataset.settingsPedestrianDensity = settings.pedestrianDensity;
    canvas.dataset.settingsTrafficDensity = settings.trafficDensity;
    canvas.dataset.settingsWorldSize = settings.worldSize;
    canvas.dataset.hijackableVehicleCount = String(hijackableVehicles.length);
    canvas.dataset.spawnRoadId = spawnCandidate.roadId;
    canvas.dataset.spawnChunkId = spawnCandidate.chunkId;
    canvas.dataset.starterVehicleId = vehicleManager.getActiveVehicle().mesh.name;
    canvas.dataset.visualPaletteChunkColor = visualPalette.chunkColor;
    canvas.dataset.visualPaletteSkyColor = visualPalette.skyColor;
    canvas.dataset.visualPaletteVehicleAccentColor = visualPalette.vehicleAccentColor;
    forceSyncCanvasTelemetry();

    resize = (): void => {
      engine.resize();
    };

    window.addEventListener("resize", resize);
    engine.runRenderLoop(() => {
      currentInputFrame = controller.captureInputFrame();
      scene.render();
      recordWorldPerformanceFrame(engine.getDeltaTime() || 16);
      maybeSyncCanvasTelemetry();
    });

    return {
      canvas,
      cycleVehicle: cycleActiveVehicle,
      dispose: () => {
        if (resize !== null) {
          window.removeEventListener("resize", resize);
        }
        scene.unregisterBeforeRender(updateWorldRuntime);
        navigationListeners.clear();
        heatListeners.clear();
        runOutcomeListeners.clear();
        removeVehicleSwitchListener();
        controller.dispose();
        possessionRuntime.dispose();
        disposeSceneResponderRuntime(responderRuntime);
        disposeSceneHeatRuntime(heatRuntime);
        disposeSceneCombatRuntime(combatRuntime);
        disposeScenePedestrianSystem(pedestrianSystem);
        disposeSceneChaosRuntime(chaosRuntime);
        trafficSystem?.dispose();
        vehicleManager.dispose();
        hijackableVehicles.forEach((vehicle) => vehicle.dispose());
        physicsAggregates.forEach((aggregate) => aggregate.dispose());
        scene.dispose();
        engine.dispose();
        canvas.remove();
      },
      getNavigationSnapshot: () => navigationSnapshot,
      subscribeNavigation: (listener) => {
        navigationListeners.add(listener);

        if (navigationSnapshot !== null) {
          listener(navigationSnapshot);
        }

        return () => {
          navigationListeners.delete(listener);
        };
      },
      subscribeCombat: (listener) => {
        combatListeners.add(listener);
        const combatSnapshot = combatRuntime.getSnapshot();
        listener({ activeWeaponId: combatSnapshot.activeWeaponId, events: [] });
        return () => {
          combatListeners.delete(listener);
        };
      },
      subscribeHeat: (listener) => {
        heatListeners.add(listener);
        listener({ events: [], snapshot: heatRuntime.getSnapshot() });
        return () => {
          heatListeners.delete(listener);
        };
      },
      subscribeRunOutcome: (listener) => {
        runOutcomeListeners.add(listener);
        listener({ events: [], snapshot: runOutcomeRuntime.getSnapshot() });
        return () => {
          runOutcomeListeners.delete(listener);
        };
      },
      switchVehicle: switchActiveVehicle
    };
    } catch (error) {
      if (resize !== null) {
        window.removeEventListener("resize", resize);
      }

      physicsAggregates.forEach((aggregate) => aggregate.dispose());
      scene.dispose();
      engine.dispose();
      canvas.remove();

      throw error;
    }
  };

  doLoad()
    .then((handle) => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      resolve(handle);
    })
    .catch((error) => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      reject(error);
    });
  });
}
}
