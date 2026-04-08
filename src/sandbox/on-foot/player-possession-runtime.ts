import { Scalar, Vector3, type AbstractMesh, type Scene, type TransformNode } from "@babylonjs/core";
import type { SliceBounds } from "../../world/chunks/slice-manifest";
import type { PlayerInputFrame, VehicleControlState } from "../../vehicles/controllers/player-vehicle-controller";
import { findSafeExitPosition } from "./exit-placement";
import { createOnFootRuntime, type OnFootRuntime } from "./on-foot-runtime";

const DEFAULT_EXIT_SPEED_THRESHOLD = 1.5;
const DEFAULT_REENTRY_RANGE = 3;
const DEFAULT_ON_FOOT_HEIGHT = 1.8;
const GAMEPAD_LOOK_YAW_SPEED = 2.4;
const GAMEPAD_LOOK_PITCH_SPEED = 1.8;
const MOUSE_LOOK_SENSITIVITY = 0.01;
const MAX_LOOK_PITCH = Math.PI / 4;
const MIN_LOOK_PITCH = -Math.PI / 6;

export interface PossessableVehicleRuntime {
  mesh: AbstractMesh;
  physicsAggregate: {
    body: {
      getLinearVelocity(): Vector3;
      setLinearVelocity(value: Vector3): void;
      setAngularVelocity(value: Vector3): void;
    };
  };
}

export interface CreatePlayerPossessionRuntimeOptions {
  scene: Scene;
  parent: TransformNode;
  sliceBounds: SliceBounds;
  surfaceMeshes: readonly AbstractMesh[];
  blockingMeshes: readonly AbstractMesh[];
  exitSpeedThreshold?: number;
  reentryRange?: number;
}

export interface PlayerPossessionRuntimeUpdate {
  transition: "none" | "exited" | "reentered";
}

export interface PlayerPossessionRuntime {
  bindActiveVehicle(vehicle: PossessableVehicleRuntime): void;
  getMode(): "vehicle" | "on-foot";
  getOnFootRuntime(): OnFootRuntime | null;
  getStoredVehicle(): PossessableVehicleRuntime | null;
  getFacingYaw(): number;
  getLookPitch(): number;
  update(frame: PlayerInputFrame, deltaSeconds: number): PlayerPossessionRuntimeUpdate;
  dispose(): void;
}

function getHorizontalSpeed(vehicle: PossessableVehicleRuntime): number {
  const velocity = vehicle.physicsAggregate.body.getLinearVelocity();

  return Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
}

function applyLookDelta(
  controlState: VehicleControlState,
  deltaSeconds: number,
  facingYaw: number,
  lookPitch: number
): { facingYaw: number; lookPitch: number } {
  if (controlState.lookInputSource === "gamepad") {
    return {
      facingYaw: facingYaw - controlState.lookX * GAMEPAD_LOOK_YAW_SPEED * deltaSeconds,
      lookPitch: Scalar.Clamp(
        lookPitch - controlState.lookY * GAMEPAD_LOOK_PITCH_SPEED * deltaSeconds,
        MIN_LOOK_PITCH,
        MAX_LOOK_PITCH
      )
    };
  }

  return {
    facingYaw: facingYaw - controlState.lookX * MOUSE_LOOK_SENSITIVITY,
    lookPitch: Scalar.Clamp(lookPitch - controlState.lookY * MOUSE_LOOK_SENSITIVITY, MIN_LOOK_PITCH, MAX_LOOK_PITCH)
  };
}

function isWithinReentryRange(onFootRuntime: OnFootRuntime, vehicle: PossessableVehicleRuntime, reentryRange: number): boolean {
  const deltaX = onFootRuntime.mesh.position.x - vehicle.mesh.position.x;
  const deltaZ = onFootRuntime.mesh.position.z - vehicle.mesh.position.z;

  return Math.sqrt(deltaX * deltaX + deltaZ * deltaZ) <= reentryRange;
}

export function createPlayerPossessionRuntime(options: CreatePlayerPossessionRuntimeOptions): PlayerPossessionRuntime {
  const {
    blockingMeshes,
    exitSpeedThreshold = DEFAULT_EXIT_SPEED_THRESHOLD,
    parent,
    reentryRange = DEFAULT_REENTRY_RANGE,
    sliceBounds,
    surfaceMeshes
  } = options;
  let activeVehicle: PossessableVehicleRuntime | null = null;
  let mode: "vehicle" | "on-foot" = "vehicle";
  let onFootRuntime: OnFootRuntime | null = null;
  let storedVehicle: PossessableVehicleRuntime | null = null;
  let facingYaw = 0;
  let lookPitch = 0;

  return {
    bindActiveVehicle: (vehicle) => {
      activeVehicle = vehicle;
    },
    getMode: () => mode,
    getOnFootRuntime: () => onFootRuntime,
    getStoredVehicle: () => storedVehicle,
    getFacingYaw: () => facingYaw,
    getLookPitch: () => lookPitch,
    update: (frame, deltaSeconds) => {
      if (mode === "vehicle") {
        if (frame.interactionRequested === false || activeVehicle === null) {
          return { transition: "none" };
        }

        if (getHorizontalSpeed(activeVehicle) > exitSpeedThreshold) {
          return { transition: "none" };
        }

        const exitPosition = findSafeExitPosition({
          blockingMeshes,
          sliceBounds,
          surfaceMeshes,
          vehicleMesh: activeVehicle.mesh
        });

        if (exitPosition === null) {
          return { transition: "none" };
        }

        const currentVelocity = activeVehicle.physicsAggregate.body.getLinearVelocity();
        activeVehicle.physicsAggregate.body.setLinearVelocity(new Vector3(0, currentVelocity.y, 0));
        activeVehicle.physicsAggregate.body.setAngularVelocity(Vector3.Zero());

        storedVehicle = activeVehicle;
        facingYaw = activeVehicle.mesh.rotation.y;
        lookPitch = 0;
        onFootRuntime = createOnFootRuntime({
          parent,
          scene: options.scene,
          startPosition: {
            x: exitPosition.position.x,
            y: exitPosition.position.y - DEFAULT_ON_FOOT_HEIGHT / 2,
            z: exitPosition.position.z
          }
        });
        mode = "on-foot";

        return { transition: "exited" };
      }

      if (onFootRuntime === null) {
        return { transition: "none" };
      }

      const nextLook = applyLookDelta(frame.vehicleControls, deltaSeconds, facingYaw, lookPitch);
      facingYaw = nextLook.facingYaw;
      lookPitch = nextLook.lookPitch;
      onFootRuntime.update({
        deltaSeconds,
        facingYaw,
        movement: frame.onFootMovement,
        sliceBounds
      });

      if (frame.interactionRequested && storedVehicle !== null && isWithinReentryRange(onFootRuntime, storedVehicle, reentryRange)) {
        onFootRuntime.dispose();
        onFootRuntime = null;
        storedVehicle = null;
        mode = "vehicle";
        lookPitch = 0;

        return { transition: "reentered" };
      }

      return { transition: "none" };
    },
    dispose: () => {
      onFootRuntime?.dispose();
      onFootRuntime = null;
      storedVehicle = null;
      activeVehicle = null;
      mode = "vehicle";
      facingYaw = 0;
      lookPitch = 0;
    }
  };
}
