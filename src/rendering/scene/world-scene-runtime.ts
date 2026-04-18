import { Vector3, type Scene } from "@babylonjs/core";
import type { SliceBounds, SliceDistrict, SliceRoad, SliceSceneMetadata } from "../../world/chunks/slice-manifest";
import type { PlayerInputFrame } from "../../vehicles/controllers/player-vehicle-controller";
import { resolveCurrentRoad } from "./world-navigation";

export type WorldScenePossessionMode = "vehicle" | "on-foot";

export interface WorldSceneRuntimeState {
  possessionMode: WorldScenePossessionMode;
  vehicleSwitchInFlight: boolean;
}

export interface WorldSceneTelemetryVehicle {
  mesh: {
    name: string;
    position: Vector3;
  };
  vehicleType: string;
}

export interface SyncWorldSceneTelemetryOptions {
  activeVehicle: WorldSceneTelemetryVehicle;
  canvas: HTMLCanvasElement;
  fallbackCameraName: string;
  onFootActorId?: string;
  performanceTelemetry?: WorldPerformanceTelemetry;
  possessionMode: WorldScenePossessionMode;
  scene: Pick<Scene, "activeCamera" | "metadata">;
  spawnPoint: Vector3;
}

export interface WorldPerformanceTelemetry {
  activeMeshCount?: number;
  fpsEstimate: number;
  frameTimeP50Ms: number;
  frameTimeP95Ms: number;
  meshCount?: number;
  sampleCount: number;
}

export interface WorldNavigationRoadSnapshot {
  id: string;
  displayName: string;
  kind: SliceRoad["kind"];
  width: number;
  points: Array<{
    x: number;
    z: number;
  }>;
}

export interface WorldNavigationSnapshot {
  actor: {
    position: {
      x: number;
      y: number;
      z: number;
    };
    facingYaw: number;
    possessionMode: WorldScenePossessionMode;
  };
  streetLabel: string | null;
  districtName: string;
  locationName: string;
  bounds: SliceBounds;
  roads: WorldNavigationRoadSnapshot[];
}

export interface CreateWorldNavigationSnapshotOptions {
  activeVehicle: {
    vehicleType: string;
    mesh: {
      getDirection?(axis: Vector3): Vector3;
      name: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
      rotation: {
        y: number;
      };
    };
  };
  manifest: {
    bounds: SliceBounds;
    districts?: SliceDistrict[];
    roads: SliceRoad[];
    sceneMetadata: Pick<SliceSceneMetadata, "displayName" | "districtName">;
  };
  roadSnapshots?: WorldNavigationRoadSnapshot[];
  onFootActor?: {
    mesh: {
      name: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
    };
  } | null;
  onFootFacingYaw?: number;
  possessionMode: WorldScenePossessionMode;
  previousActorId?: string;
  previousRoadId?: string;
}

const WORLD_FORWARD_AXIS = new Vector3(0, 0, 1);

function getVehicleFacingYaw(options: CreateWorldNavigationSnapshotOptions["activeVehicle"]): number {
  const liveForward = options.mesh.getDirection?.(WORLD_FORWARD_AXIS);

  if (liveForward) {
    const horizontalMagnitude = Math.hypot(liveForward.x, liveForward.z);

    if (horizontalMagnitude > 0.0001) {
      return Math.atan2(liveForward.x, liveForward.z);
    }
  }

  return options.mesh.rotation.y;
}

export function createWorldNavigationRoadSnapshots(roads: SliceRoad[]): WorldNavigationRoadSnapshot[] {
  return roads.map((road) => ({
    id: road.id,
    displayName: road.displayName ?? road.id,
    kind: road.kind,
    width: road.width,
    points: road.points.map((point) => ({
      x: point.x,
      z: point.z
    }))
  }));
}

function resolveCurrentDistrictName(options: {
  districts?: SliceDistrict[];
  fallbackDistrictName: string;
  position: {
    x: number;
    z: number;
  };
}): string {
  const district = options.districts?.find(
    (candidate) =>
      options.position.x >= candidate.bounds.minX &&
      options.position.x <= candidate.bounds.maxX &&
      options.position.z >= candidate.bounds.minZ &&
      options.position.z <= candidate.bounds.maxZ
  );

  return district?.displayName ?? options.fallbackDistrictName;
}

export function createWorldNavigationSnapshot(
  options: CreateWorldNavigationSnapshotOptions
): { snapshot: WorldNavigationSnapshot; currentActorId: string; currentRoadId: string | null } {
  const activeActor =
    options.possessionMode === "on-foot" && options.onFootActor
      ? {
          actorId: options.onFootActor.mesh.name,
          facingYaw: options.onFootFacingYaw ?? 0,
          position: options.onFootActor.mesh.position
        }
      : {
          actorId: options.activeVehicle.mesh.name,
          facingYaw: getVehicleFacingYaw(options.activeVehicle),
          position: options.activeVehicle.mesh.position
        };
  const currentRoad = resolveCurrentRoad({
    roads: options.manifest.roads,
    position: {
      x: activeActor.position.x,
      z: activeActor.position.z
    },
    previousRoadId: options.previousActorId === activeActor.actorId ? options.previousRoadId : undefined
  });

  return {
    currentActorId: activeActor.actorId,
    currentRoadId: currentRoad?.id ?? null,
    snapshot: {
      actor: {
        position: {
          x: activeActor.position.x,
          y: activeActor.position.y,
          z: activeActor.position.z
        },
        facingYaw: activeActor.facingYaw,
        possessionMode: options.possessionMode
      },
      streetLabel: currentRoad?.displayName ?? null,
      districtName: resolveCurrentDistrictName({
        districts: options.manifest.districts,
        fallbackDistrictName: options.manifest.sceneMetadata.districtName,
        position: {
          x: activeActor.position.x,
          z: activeActor.position.z
        }
      }),
      locationName: options.manifest.sceneMetadata.displayName,
      bounds: options.manifest.bounds,
      roads: options.roadSnapshots ?? createWorldNavigationRoadSnapshots(options.manifest.roads)
    }
  };
}

export function canSwitchControlledVehicle(state: WorldSceneRuntimeState): boolean {
  return state.possessionMode === "vehicle" && state.vehicleSwitchInFlight === false;
}

export function sanitizeWorldRuntimeInputFrame(
  frame: PlayerInputFrame,
  state: WorldSceneRuntimeState
): PlayerInputFrame {
  if (state.possessionMode === "on-foot" && state.vehicleSwitchInFlight === false) {
    return frame;
  }

  return {
    ...frame,
    combatControls: {
      ...frame.combatControls,
      firePressed: false,
      weaponCycleDirection: 0,
      weaponSlotRequested: null
    },
    interactionRequested: state.vehicleSwitchInFlight ? false : frame.interactionRequested
  };
}

export function getWorldSceneActiveCameraName(
  scene: Pick<Scene, "activeCamera">,
  fallbackCameraName: string
): string {
  return scene.activeCamera?.name ?? fallbackCameraName;
}

function formatWorldPerformanceValue(value: number): string {
  return value.toFixed(2);
}

export function syncWorldSceneTelemetry(options: SyncWorldSceneTelemetryOptions): void {
  const { activeVehicle, canvas, fallbackCameraName, onFootActorId, performanceTelemetry, possessionMode, scene, spawnPoint } = options;
  const deltaX = activeVehicle.mesh.position.x - spawnPoint.x;
  const deltaZ = activeVehicle.mesh.position.z - spawnPoint.z;
  const horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
  const activeCameraName = getWorldSceneActiveCameraName(scene, fallbackCameraName);

  if (scene.metadata && typeof scene.metadata === "object") {
    Object.assign(scene.metadata, {
        activeCamera: activeCameraName,
        activeVehicleType: activeVehicle.vehicleType,
        possessionMode,
        starterVehicleId: activeVehicle.mesh.name
      });

      if (performanceTelemetry) {
        Object.assign(scene.metadata, {
          performanceActiveMeshCount: performanceTelemetry.activeMeshCount,
          performanceFpsEstimate: performanceTelemetry.fpsEstimate,
          performanceFrameTimeP50Ms: performanceTelemetry.frameTimeP50Ms,
          performanceFrameTimeP95Ms: performanceTelemetry.frameTimeP95Ms,
          performanceMeshCount: performanceTelemetry.meshCount,
          performanceSampleCount: performanceTelemetry.sampleCount
        });
      }
    }

  canvas.dataset.starterVehicleDistance = horizontalDistance.toFixed(3);
  canvas.dataset.starterVehicleId = activeVehicle.mesh.name;
  canvas.dataset.starterVehicleX = activeVehicle.mesh.position.x.toFixed(3);
  canvas.dataset.starterVehicleZ = activeVehicle.mesh.position.z.toFixed(3);
  canvas.dataset.activeVehicleType = activeVehicle.vehicleType;
  canvas.dataset.activeCamera = activeCameraName;
  canvas.dataset.possessionMode = possessionMode;
  canvas.dataset.onFootActorId = onFootActorId ?? "";

  if (performanceTelemetry) {
    canvas.dataset.performanceFpsEstimate = formatWorldPerformanceValue(performanceTelemetry.fpsEstimate);
    canvas.dataset.performanceFrameTimeP50Ms = formatWorldPerformanceValue(performanceTelemetry.frameTimeP50Ms);
    canvas.dataset.performanceFrameTimeP95Ms = formatWorldPerformanceValue(performanceTelemetry.frameTimeP95Ms);
    canvas.dataset.performanceSampleCount = String(performanceTelemetry.sampleCount);

    if (performanceTelemetry.meshCount !== undefined) {
      canvas.dataset.performanceMeshCount = String(performanceTelemetry.meshCount);
    }

    if (performanceTelemetry.activeMeshCount !== undefined) {
      canvas.dataset.performanceActiveMeshCount = String(performanceTelemetry.activeMeshCount);
    }
  }
}
