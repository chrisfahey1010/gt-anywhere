import { describe, expect, it } from "vitest";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import { createVehicleDamageSystem } from "../../src/vehicles/damage/vehicle-damage-system";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createTuning(durability: number, impactSpeedThreshold: number): VehicleTuning {
  return {
    name: "Sedan",
    mass: 1400,
    color: "#f25f5c",
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    damage: {
      durability,
      impactSpeedThreshold
    },
    model: {
      bodyStyle: "sedan"
    },
    dimensions: {
      width: 1.8,
      height: 1.4,
      length: 4.5
    }
  };
}

describe("vehicle damage system", () => {
  it("classifies impacts above threshold, accumulates damage, and dedupes repeated contacts for a cooldown window", () => {
    const system = createVehicleDamageSystem();
    const vehicles = [
      {
        damageState: createPristineVehicleDamageState(),
        id: "starter-vehicle",
        tuning: createTuning(100, 7)
      }
    ];

    expect(
      system.update({
        currentTimeSeconds: 1,
        impacts: [
          {
            impactSpeed: 6.5,
            sourceId: "traffic-1",
            sourceType: "vehicle",
            targetVehicleId: "starter-vehicle"
          }
        ],
        vehicles
      })
    ).toEqual([]);

    const firstEvents = system.update({
      currentTimeSeconds: 1.2,
      impacts: [
        {
          impactSpeed: 12,
          sourceId: "traffic-1",
          sourceType: "vehicle",
          targetVehicleId: "starter-vehicle"
        }
      ],
      vehicles
    });

    expect(firstEvents).toEqual([
      expect.objectContaining({
        damageDelta: 5,
        damageState: expect.objectContaining({
          accumulatedDamage: 5,
          normalizedSeverity: 0.05,
          severity: "minor"
        }),
        sourceId: "traffic-1",
        sourceType: "vehicle",
        targetVehicleId: "starter-vehicle",
        type: "vehicle.damaged"
      })
    ]);
    expect(system.getVehicleDamage("starter-vehicle")).toEqual(
      expect.objectContaining({
        accumulatedDamage: 5,
        normalizedSeverity: 0.05,
        severity: "minor"
      })
    );

    expect(
      system.update({
        currentTimeSeconds: 1.3,
        impacts: [
          {
            impactSpeed: 12,
            sourceId: "traffic-1",
            sourceType: "vehicle",
            targetVehicleId: "starter-vehicle"
          }
        ],
        vehicles
      })
    ).toEqual([]);

    expect(
      system.update({
        currentTimeSeconds: 1.7,
        impacts: [
          {
            impactSpeed: 17,
            sourceId: "traffic-1",
            sourceType: "vehicle",
            targetVehicleId: "starter-vehicle"
          }
        ],
        vehicles
      })
    ).toEqual([
      expect.objectContaining({
        damageDelta: 10,
        damageState: expect.objectContaining({
          accumulatedDamage: 15,
          normalizedSeverity: 0.15,
          severity: "moderate"
        }),
        type: "vehicle.damaged"
      })
    ]);
  });
});
