import type { VehicleTuning } from "../physics/vehicle-factory";

export interface VehicleDamageState {
  accumulatedDamage: number;
  normalizedSeverity: number;
}

interface VehicleDamageTuningLike {
  damage: Pick<VehicleTuning["damage"], "durability">;
}

function clampNormalizedSeverity(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function createPristineVehicleDamageState(): VehicleDamageState {
  return {
    accumulatedDamage: 0,
    normalizedSeverity: 0
  };
}

export function createVehicleDamageState(options: {
  accumulatedDamage: number;
  tuning: VehicleDamageTuningLike;
}): VehicleDamageState {
  const { accumulatedDamage, tuning } = options;
  const durability = Math.max(tuning.damage.durability, 1);
  const normalizedSeverity = clampNormalizedSeverity(accumulatedDamage / durability);

  return {
    accumulatedDamage: Math.max(0, normalizedSeverity * durability),
    normalizedSeverity
  };
}

export function applyVehicleSwitchDamagePolicy(
  state: VehicleDamageState,
  nextTuning: VehicleDamageTuningLike
): VehicleDamageState {
  return createVehicleDamageState({
    accumulatedDamage: clampNormalizedSeverity(state.normalizedSeverity) * Math.max(nextTuning.damage.durability, 1),
    tuning: nextTuning
  });
}

export function applyVehicleTransferDamagePolicy(state: VehicleDamageState): VehicleDamageState {
  return {
    accumulatedDamage: Math.max(0, state.accumulatedDamage),
    normalizedSeverity: clampNormalizedSeverity(state.normalizedSeverity)
  };
}

export function applyVehicleResetDamagePolicy(): VehicleDamageState {
  return createPristineVehicleDamageState();
}
