import HavokPhysics from "@babylonjs/havok";
import {
  AbstractMesh,
  Color3,
  Color4,
  Engine,
  HavokPlugin,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import type { SpawnCandidate, SliceManifest, SliceRoad } from "../../world/chunks/slice-manifest";
import { createOnFootCamera, type OnFootCamera } from "../../sandbox/on-foot/create-on-foot-camera";
import {
  createPlayerPossessionRuntime,
  type PlayerPossessionRuntime
} from "../../sandbox/on-foot/player-possession-runtime";
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
  sanitizeWorldRuntimeInputFrame,
  syncWorldSceneTelemetry
} from "./world-scene-runtime";

const AVAILABLE_VEHICLE_TYPES = ["sedan", "sports-car", "heavy-truck"] as const;
const DEFAULT_VEHICLE_TYPE = AVAILABLE_VEHICLE_TYPES[0];

export interface WorldSceneHandle {
  canvas: HTMLCanvasElement;
  cycleVehicle?(): Promise<void>;
  dispose(): void;
  switchVehicle?(vehicleType: string): Promise<void>;
}

export interface CreateWorldSceneOptions {
  renderHost: HTMLElement;
  manifest: SliceManifest;
  spawnCandidate: SpawnCandidate;
}

export interface WorldSceneLoader {
  load(options: CreateWorldSceneOptions): Promise<WorldSceneHandle>;
}

function buildRoadSegments(
  scene: Scene,
  parent: TransformNode,
  road: SliceRoad,
  material: StandardMaterial
): AbstractMesh[] {
  const segments: AbstractMesh[] = [];

  for (let index = 0; index < road.points.length - 1; index += 1) {
    const start = road.points[index];
    const end = road.points[index + 1];

    if (!start || !end) {
      continue;
    }

    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    const midpoint = new Vector3((start.x + end.x) / 2, 0.45, (start.z + end.z) / 2);
    const segment = MeshBuilder.CreateBox(
      `${road.id}-segment-${index}`,
      {
        width: road.width,
        height: 0.9,
        depth: length
      },
      scene
    );

    segment.position = midpoint;
    segment.rotation.y = Math.atan2(deltaX, deltaZ);
    segment.parent = parent;
    segment.material = material;
    segment.checkCollisions = true;
    segments.push(segment);
  }

  return segments;
}

function buildChunkMassing(
  scene: Scene,
  parent: TransformNode,
  manifest: SliceManifest,
  chunkIndex: number,
  spawnChunkId: string
): AbstractMesh[] {
  const chunk = manifest.chunks[chunkIndex];
  const buildings: AbstractMesh[] = [];

  if (!chunk || chunk.id === spawnChunkId) {
    return buildings;
  }

  const material = new StandardMaterial(`chunk-massing-material-${chunk.id}`, scene);
  material.diffuseColor = Color3.FromHexString("#52616b");

  for (let buildingIndex = 0; buildingIndex < 3; buildingIndex += 1) {
    const width = 20 + buildingIndex * 10;
    const depth = 18 + buildingIndex * 8;
    const height = 24 + buildingIndex * 14 + chunkIndex * 4;
    const building = MeshBuilder.CreateBox(
      `${chunk.id}-building-${buildingIndex}`,
      {
        width,
        depth,
        height
      },
      scene
    );

    building.position = new Vector3(
      chunk.origin.x + 36 + buildingIndex * 38,
      height / 2,
      chunk.origin.z + 46 + (chunkIndex % 2) * 48
    );
    building.parent = parent;
    building.material = material;
    buildings.push(building);
  }

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
    const { renderHost, manifest, spawnCandidate } = options;
    const canvas = document.createElement("canvas");
    canvas.className = "world-canvas";
    canvas.setAttribute("aria-label", `${manifest.location.placeName} world view`);
    canvas.tabIndex = 0;
    renderHost.replaceChildren(canvas);

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString("#a7d8ff");

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
    light.intensity = 0.95;

    const groundMaterial = new StandardMaterial("slice-ground-material", scene);
    groundMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.groundColor);

    const roadMaterial = new StandardMaterial("slice-road-material", scene);
    roadMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.roadColor);

    const boundaryMaterial = new StandardMaterial("slice-boundary-material", scene);
    boundaryMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.boundaryColor);
    boundaryMaterial.alpha = 0.3;

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

    const chunkRoots = manifest.chunks.map((chunk, chunkIndex) => {
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

      manifest.roads
        .filter((road) => chunk.roadIds.includes(road.id))
        .forEach((road) => {
          const roadSegments = buildRoadSegments(scene, chunkRoot, road, roadMaterial);
          staticPhysicsMeshes.push(...roadSegments);
          walkableSurfaceMeshes.push(...roadSegments);
        });

      const chunkMassing = buildChunkMassing(scene, chunkRoot, manifest, chunkIndex, spawnCandidate.chunkId);
      staticPhysicsMeshes.push(...chunkMassing);
      exitBlockingMeshes.push(...chunkMassing);

      return chunkRoot;
    });

    const physicsAggregates = await enableStaticPhysics(scene, staticPhysicsMeshes);
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

    try {
      const defaultTuning = await loadTuningProfile(DEFAULT_VEHICLE_TYPE);
      const activeVehicle = createManagedVehicleRuntime({
        vehicleType: DEFAULT_VEHICLE_TYPE,
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
          tuning: defaultTuning
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
            tuning
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
              tuning
            })
          });
        })
      );

      controller.bindVehicle(vehicleManager.getActiveVehicle().mesh);
    } catch (error) {
      controller.dispose();
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

    let currentInputFrame: PlayerInputFrame = controller.captureInputFrame();
    const possessionRuntime: PlayerPossessionRuntime = createPlayerPossessionRuntime({
      blockingMeshes: exitBlockingMeshes,
      getInteractableVehicles: () => hijackableVehicles,
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

    const completeHijack = (nextVehicle: ManagedVehicleRuntime): void => {
      const previousVehicle = vehicleManager.getActiveVehicle();

      if (previousVehicle === nextVehicle) {
        return;
      }

      hijackableVehicles = hijackableVehicles.filter((vehicle) => vehicle !== nextVehicle);

      if (!hijackableVehicles.includes(previousVehicle)) {
        hijackableVehicles = [...hijackableVehicles, previousVehicle];
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
      syncCanvasTelemetry();
    };

    const cycleActiveVehicle = async (): Promise<void> => {
      if (!canSwitchControlledVehicle({ possessionMode: possessionRuntime.getMode(), vehicleSwitchInFlight })) {
        return;
      }

      vehicleSwitchInFlight = true;

      try {
        await vehicleManager.cycleVehicle();
        syncCanvasTelemetry();
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
        syncCanvasTelemetry();
      } finally {
        vehicleSwitchInFlight = false;
      }
    };

    const updateWorldRuntime = (): void => {
      const deltaTimeMs = scene.getEngine().getDeltaTime() || 16;
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
    };

    const syncCanvasTelemetry = (): void => {
      syncWorldSceneTelemetry({
        activeVehicle: vehicleManager.getActiveVehicle(),
        canvas,
        fallbackCameraName: camera.name,
        onFootActorId: possessionRuntime.getOnFootRuntime()?.mesh.name,
        possessionMode: possessionRuntime.getMode(),
        scene,
        spawnPoint
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
        syncCanvasTelemetry();
      });
      scene.registerBeforeRender(updateWorldRuntime);
    } catch (error) {
      controller.dispose();
      possessionRuntime.dispose();
      vehicleManager.dispose();
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
        sliceId: manifest.sliceId,
        worldRootName: worldRoot.name,
      staticSurfaceRootName: staticSurfaceRoot.name,
      chunkRootNames: chunkRoots.map((chunkRoot) => chunkRoot.name),
      physicsReady: scene.isPhysicsEnabled(),
      starterVehicleId: vehicleManager.getActiveVehicle().mesh.name,
      availableVehicleTypes: [...AVAILABLE_VEHICLE_TYPES],
      activeVehicleType: vehicleManager.getActiveVehicle().vehicleType,
      activeCamera: camera.name,
      hijackableVehicleCount: hijackableVehicles.length,
      hijackableVehicleIds: hijackableVehicles.map((vehicle) => vehicle.mesh.name),
      readinessMilestone: "controllable-vehicle",
      spawnRoadId: spawnCandidate.roadId,
      spawnChunkId: spawnCandidate.chunkId
    };
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = camera.name;
    canvas.dataset.hijackableVehicleCount = String(hijackableVehicles.length);
    canvas.dataset.spawnRoadId = spawnCandidate.roadId;
    canvas.dataset.spawnChunkId = spawnCandidate.chunkId;
    canvas.dataset.starterVehicleId = vehicleManager.getActiveVehicle().mesh.name;
    syncCanvasTelemetry();

    const resize = (): void => {
      engine.resize();
    };

    window.addEventListener("resize", resize);
    engine.runRenderLoop(() => {
      currentInputFrame = controller.captureInputFrame();
      scene.render();
      syncCanvasTelemetry();
    });

    return {
      canvas,
      cycleVehicle: cycleActiveVehicle,
      dispose: () => {
        window.removeEventListener("resize", resize);
        scene.unregisterBeforeRender(updateWorldRuntime);
        removeVehicleSwitchListener();
        controller.dispose();
        possessionRuntime.dispose();
        vehicleManager.dispose();
        hijackableVehicles.forEach((vehicle) => vehicle.dispose());
        physicsAggregates.forEach((aggregate) => aggregate.dispose());
        scene.dispose();
        engine.dispose();
        canvas.remove();
      },
      switchVehicle: switchActiveVehicle
    };
  }
}
