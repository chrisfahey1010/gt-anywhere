import { Vector3, type Scene } from "@babylonjs/core";
import type { PlayerInputFrame } from "../../vehicles/controllers/player-vehicle-controller";

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
  possessionMode: WorldScenePossessionMode;
  scene: Pick<Scene, "activeCamera" | "metadata">;
  spawnPoint: Vector3;
}

export function canSwitchControlledVehicle(state: WorldSceneRuntimeState): boolean {
  return state.possessionMode === "vehicle" && state.vehicleSwitchInFlight === false;
}

export function sanitizeWorldRuntimeInputFrame(
  frame: PlayerInputFrame,
  state: WorldSceneRuntimeState
): PlayerInputFrame {
  if (canSwitchControlledVehicle(state) || state.possessionMode === "on-foot") {
    return frame;
  }

  return {
    ...frame,
    interactionRequested: false
  };
}

export function getWorldSceneActiveCameraName(
  scene: Pick<Scene, "activeCamera">,
  fallbackCameraName: string
): string {
  return scene.activeCamera?.name ?? fallbackCameraName;
}

export function syncWorldSceneTelemetry(options: SyncWorldSceneTelemetryOptions): void {
  const { activeVehicle, canvas, fallbackCameraName, onFootActorId, possessionMode, scene, spawnPoint } = options;
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
  }

  canvas.dataset.starterVehicleDistance = horizontalDistance.toFixed(3);
  canvas.dataset.starterVehicleId = activeVehicle.mesh.name;
  canvas.dataset.starterVehicleX = activeVehicle.mesh.position.x.toFixed(3);
  canvas.dataset.starterVehicleZ = activeVehicle.mesh.position.z.toFixed(3);
  canvas.dataset.activeVehicleType = activeVehicle.vehicleType;
  canvas.dataset.activeCamera = activeCameraName;
  canvas.dataset.possessionMode = possessionMode;
  canvas.dataset.onFootActorId = onFootActorId ?? "";
}
