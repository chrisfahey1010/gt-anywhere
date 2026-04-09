import { Quaternion, Vector3 } from "@babylonjs/core";
import {
  applyVehicleSwitchDamagePolicy,
  applyVehicleTransferDamagePolicy,
  createPristineVehicleDamageState,
  type VehicleDamageState
} from "../damage/vehicle-damage-policy";
import type { StarterVehicleRuntime } from "./create-starter-vehicle";
import type { VehicleTuning } from "./vehicle-factory";

export interface ManagedVehicleRuntime extends StarterVehicleRuntime {
  damageState: VehicleDamageState;
  vehicleType: string;
  tuning: VehicleTuning;
}

export interface VehicleSwitchedEvent {
  type: "vehicle.switched";
  previousVehicle: ManagedVehicleRuntime;
  activeVehicle: ManagedVehicleRuntime;
}

export interface CreateManagedVehicleRuntimeOptions {
  damageState?: VehicleDamageState;
  vehicleType: string;
  tuning: VehicleTuning;
  runtime: StarterVehicleRuntime;
}

export interface CreateVehicleManagerOptions {
  activeVehicle: ManagedVehicleRuntime;
  availableVehicleTypes: readonly string[];
  loadTuningProfile(vehicleType: string): Promise<VehicleTuning>;
  spawnVehicle(options: { vehicleType: string; tuning: VehicleTuning }): StarterVehicleRuntime;
}

export interface VehicleManager {
  getActiveVehicle(): ManagedVehicleRuntime;
  cycleVehicle(): Promise<ManagedVehicleRuntime>;
  setActiveVehicle(vehicle: ManagedVehicleRuntime): ManagedVehicleRuntime;
  switchVehicle(vehicleType: string): Promise<ManagedVehicleRuntime>;
  onVehicleSwitched(listener: (event: VehicleSwitchedEvent) => void): () => void;
  dispose(): void;
}

interface VehiclePhysicsSnapshot {
  position: Vector3;
  rotation: Vector3;
  rotationQuaternion: Quaternion | null;
  linearVelocity: Vector3;
  angularVelocity: Vector3;
}

export function createManagedVehicleRuntime(options: CreateManagedVehicleRuntimeOptions): ManagedVehicleRuntime {
  const { damageState, vehicleType, tuning, runtime } = options;

  return {
    ...runtime,
    damageState: damageState ? applyVehicleTransferDamagePolicy(damageState) : createPristineVehicleDamageState(),
    vehicleType,
    tuning
  };
}

function captureVehiclePhysicsState(vehicle: StarterVehicleRuntime): VehiclePhysicsSnapshot {
  return {
    position: vehicle.mesh.position.clone(),
    rotation: vehicle.mesh.rotation.clone(),
    rotationQuaternion: vehicle.mesh.rotationQuaternion?.clone() ?? null,
    linearVelocity: vehicle.physicsAggregate.body.getLinearVelocity().clone(),
    angularVelocity: vehicle.physicsAggregate.body.getAngularVelocity().clone()
  };
}

function applyVehiclePhysicsState(vehicle: StarterVehicleRuntime, snapshot: VehiclePhysicsSnapshot): void {
  const targetRotation = snapshot.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(snapshot.rotation);

  vehicle.mesh.position.copyFrom(snapshot.position);

  if (snapshot.rotationQuaternion !== null) {
    vehicle.mesh.rotationQuaternion = snapshot.rotationQuaternion.clone();
    vehicle.mesh.rotation.copyFromFloats(0, 0, 0);
  } else {
    vehicle.mesh.rotationQuaternion = null;
    vehicle.mesh.rotation.copyFrom(snapshot.rotation);
  }

  vehicle.mesh.computeWorldMatrix(true);
  vehicle.physicsAggregate.body.setTargetTransform(snapshot.position.clone(), targetRotation);
  vehicle.physicsAggregate.body.setLinearVelocity(snapshot.linearVelocity.clone());
  vehicle.physicsAggregate.body.setAngularVelocity(snapshot.angularVelocity.clone());
}

export function createVehicleManager(options: CreateVehicleManagerOptions): VehicleManager {
  const { availableVehicleTypes, loadTuningProfile, spawnVehicle } = options;
  const tuningCache = new Map<string, VehicleTuning>([[options.activeVehicle.vehicleType, options.activeVehicle.tuning]]);
  const listeners = new Set<(event: VehicleSwitchedEvent) => void>();
  let activeVehicle = options.activeVehicle;

  const getTuning = async (vehicleType: string): Promise<VehicleTuning> => {
    const cachedTuning = tuningCache.get(vehicleType);

    if (cachedTuning) {
      return cachedTuning;
    }

    const tuning = await loadTuningProfile(vehicleType);
    tuningCache.set(vehicleType, tuning);

    return tuning;
  };

  const finalizeSwitch = (previousVehicle: ManagedVehicleRuntime, nextVehicle: ManagedVehicleRuntime): ManagedVehicleRuntime => {
    activeVehicle = nextVehicle;
    previousVehicle.dispose();

    const event: VehicleSwitchedEvent = {
      type: "vehicle.switched",
      previousVehicle,
      activeVehicle: nextVehicle
    };

    listeners.forEach((listener) => {
      listener(event);
    });

    return nextVehicle;
  };

  const switchVehicle = async (vehicleType: string): Promise<ManagedVehicleRuntime> => {
    if (vehicleType === activeVehicle.vehicleType) {
      return activeVehicle;
    }

    const previousVehicle = activeVehicle;
    const snapshot = captureVehiclePhysicsState(previousVehicle);
    const tuning = await getTuning(vehicleType);
    const nextVehicleRuntime = spawnVehicle({ vehicleType, tuning });
    const nextVehicle = createManagedVehicleRuntime({
      damageState: applyVehicleSwitchDamagePolicy(previousVehicle.damageState, tuning),
      vehicleType,
      tuning,
      runtime: nextVehicleRuntime
    });

    try {
      applyVehiclePhysicsState(nextVehicle, snapshot);
    } catch (error) {
      nextVehicle.dispose();
      throw error;
    }

    return finalizeSwitch(previousVehicle, nextVehicle);
  };

  const cycleVehicle = async (): Promise<ManagedVehicleRuntime> => {
    if (availableVehicleTypes.length <= 1) {
      return activeVehicle;
    }

    const currentIndex = availableVehicleTypes.indexOf(activeVehicle.vehicleType);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableVehicleTypes.length : 0;

    return switchVehicle(availableVehicleTypes[nextIndex]);
  };

  return {
    getActiveVehicle: () => activeVehicle,
    cycleVehicle,
    setActiveVehicle: (vehicle) => {
      activeVehicle = vehicle;

      return activeVehicle;
    },
    switchVehicle,
    onVehicleSwitched: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      listeners.clear();
      activeVehicle.dispose();
    }
  };
}
