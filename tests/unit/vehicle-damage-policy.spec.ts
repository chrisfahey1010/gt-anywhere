import { describe, expect, it } from "vitest";
import {
  applyVehicleResetDamagePolicy,
  applyVehicleSwitchDamagePolicy,
  applyVehicleTransferDamagePolicy,
  createVehicleDamageState
} from "../../src/vehicles/damage/vehicle-damage-policy";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createTuning(durability: number, impactSpeedThreshold: number): VehicleTuning {
  return {
    name: durability > 100 ? "Heavy Truck" : "Sedan",
    mass: durability > 100 ? 5000 : 1400,
    color: durability > 100 ? "#0000ff" : "#f25f5c",
    maxForwardSpeed: durability > 100 ? 12 : 18,
    maxReverseSpeed: durability > 100 ? 5 : 7,
    maxTurnRate: durability > 100 ? 1 : 1.8,
    damage: {
      durability,
      impactSpeedThreshold
    },
    model: {
      bodyStyle: durability > 100 ? "heavy-truck" : "sedan"
    },
    dimensions: {
      width: durability > 100 ? 2.5 : 1.8,
      height: durability > 100 ? 3.5 : 1.4,
      length: durability > 100 ? 7 : 4.5
    }
  };
}

describe("vehicle damage policy", () => {
  it("preserves normalized severity when switching vehicle types", () => {
    const sedanTuning = createTuning(80, 6);
    const sportsCarTuning = createTuning(48, 7);
    const currentState = createVehicleDamageState({
      accumulatedDamage: 20,
      tuning: sedanTuning
    });

    const switchedState = applyVehicleSwitchDamagePolicy(currentState, sportsCarTuning);

    expect(switchedState.normalizedSeverity).toBeCloseTo(0.25);
    expect(switchedState.accumulatedDamage).toBeCloseTo(12);
  });

  it("keeps damage attached to the same physical vehicle during transfer-style flows", () => {
    const state = createVehicleDamageState({
      accumulatedDamage: 18,
      tuning: createTuning(60, 5)
    });

    const transferredState = applyVehicleTransferDamagePolicy(state);

    expect(transferredState).toEqual(state);
    expect(transferredState).not.toBe(state);
  });

  it("resets damage on restart and replay", () => {
    expect(applyVehicleResetDamagePolicy()).toEqual({
      accumulatedDamage: 0,
      normalizedSeverity: 0
    });
  });
});
