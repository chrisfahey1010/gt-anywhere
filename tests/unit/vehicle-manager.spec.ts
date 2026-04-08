import { Quaternion, Vector3 } from "@babylonjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StarterVehicleRuntime } from "../../src/vehicles/physics/create-starter-vehicle";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";
import {
  createManagedVehicleRuntime,
  createVehicleManager
} from "../../src/vehicles/physics/vehicle-manager";

interface RuntimeState {
  position?: Vector3;
  rotation?: Vector3;
  linearVelocity?: Vector3;
  angularVelocity?: Vector3;
}

function createTuning(name: string, color: string): VehicleTuning {
  return {
    name,
    mass: 1200,
    color,
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    model: {
      bodyStyle: name === "Heavy Truck" ? "heavy-truck" : name === "Sports Car" ? "sports-car" : "sedan"
    },
    dimensions: {
      width: 1.8,
      height: 1.4,
      length: 4.5
    }
  };
}

function createRuntime(state: RuntimeState = {}): StarterVehicleRuntime {
  const mesh = {
    computeWorldMatrix: vi.fn(),
    position: state.position?.clone() ?? new Vector3(0, 0, 0),
    rotation: state.rotation?.clone() ?? new Vector3(0, 0, 0),
    rotationQuaternion: null
  } as unknown as StarterVehicleRuntime["mesh"];
  const linearVelocity = state.linearVelocity?.clone() ?? new Vector3(0, 0, 0);
  const angularVelocity = state.angularVelocity?.clone() ?? new Vector3(0, 0, 0);

  return {
    mesh,
    physicsAggregate: {
      body: {
        getLinearVelocity: vi.fn(() => linearVelocity.clone()),
        getAngularVelocity: vi.fn(() => angularVelocity.clone()),
        setTargetTransform: vi.fn(),
        setLinearVelocity: vi.fn((value: Vector3) => {
          linearVelocity.copyFrom(value);
        }),
        setAngularVelocity: vi.fn((value: Vector3) => {
          angularVelocity.copyFrom(value);
        })
      }
    } as unknown as StarterVehicleRuntime["physicsAggregate"],
    update: vi.fn(),
    dispose: vi.fn()
  };
}

describe("vehicle manager", () => {
  const sedanTuning = createTuning("Sedan", "#f25f5c");
  const sportsCarTuning = createTuning("Sports Car", "#ff0000");
  const heavyTruckTuning = createTuning("Heavy Truck", "#0000ff");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches to a new vehicle type and preserves transform and velocity state", async () => {
    const activeVehicle = createManagedVehicleRuntime({
      vehicleType: "sedan",
      tuning: sedanTuning,
      runtime: createRuntime({
        position: new Vector3(12, 4.5, -8),
        rotation: new Vector3(0, Math.PI / 3, 0),
        linearVelocity: new Vector3(14, 0, 5),
        angularVelocity: new Vector3(0, 0.6, 0)
      })
    });
    const nextVehicleRuntime = createRuntime();
    const loadTuningProfile = vi.fn(async (vehicleType: string) => {
      if (vehicleType === "sports-car") {
        return sportsCarTuning;
      }

      return sedanTuning;
    });
    const spawnVehicle = vi.fn(({ vehicleType, tuning }: { vehicleType: string; tuning: VehicleTuning }) =>
      createManagedVehicleRuntime({
        vehicleType,
        tuning,
        runtime: nextVehicleRuntime
      })
    );
    const manager = createVehicleManager({
      activeVehicle,
      availableVehicleTypes: ["sedan", "sports-car"],
      loadTuningProfile,
      spawnVehicle
    });
    const switchedEvents: string[] = [];

    manager.onVehicleSwitched((event) => {
      switchedEvents.push(`${event.previousVehicle.vehicleType}->${event.activeVehicle.vehicleType}`);
    });

    const switchedVehicle = await manager.switchVehicle("sports-car");

    expect(loadTuningProfile).toHaveBeenCalledWith("sports-car");
    expect(spawnVehicle).toHaveBeenCalledWith({
      vehicleType: "sports-car",
      tuning: sportsCarTuning
    });
    expect(activeVehicle.dispose).toHaveBeenCalledTimes(1);
    expect(switchedVehicle.vehicleType).toBe("sports-car");
    expect(switchedVehicle.mesh.position.equalsWithEpsilon(new Vector3(12, 4.5, -8))).toBe(true);
    expect(switchedVehicle.mesh.rotation.equalsWithEpsilon(new Vector3(0, Math.PI / 3, 0))).toBe(true);
    expect(nextVehicleRuntime.physicsAggregate.body.setTargetTransform).toHaveBeenCalledTimes(1);
    const [targetPosition, targetRotation] = vi.mocked(nextVehicleRuntime.physicsAggregate.body.setTargetTransform).mock
      .calls[0] as [Vector3, Quaternion];
    expect(targetPosition.equalsWithEpsilon(new Vector3(12, 4.5, -8))).toBe(true);
    expect(targetRotation.equalsWithEpsilon(Quaternion.FromEulerVector(new Vector3(0, Math.PI / 3, 0)))).toBe(true);
    expect(nextVehicleRuntime.physicsAggregate.body.setLinearVelocity).toHaveBeenCalledTimes(1);
    expect(nextVehicleRuntime.physicsAggregate.body.setAngularVelocity).toHaveBeenCalledTimes(1);
    expect(switchedEvents).toEqual(["sedan->sports-car"]);
  });

  it("cycles to the next available vehicle type and wraps around the list", async () => {
    const manager = createVehicleManager({
      activeVehicle: createManagedVehicleRuntime({
        vehicleType: "heavy-truck",
        tuning: heavyTruckTuning,
        runtime: createRuntime()
      }),
      availableVehicleTypes: ["sedan", "sports-car", "heavy-truck"],
      loadTuningProfile: vi.fn(async (vehicleType: string) => {
        if (vehicleType === "sedan") {
          return sedanTuning;
        }

        if (vehicleType === "sports-car") {
          return sportsCarTuning;
        }

        return heavyTruckTuning;
      }),
      spawnVehicle: vi.fn(({ vehicleType, tuning }: { vehicleType: string; tuning: VehicleTuning }) =>
        createManagedVehicleRuntime({
          vehicleType,
          tuning,
          runtime: createRuntime()
        })
      )
    });

    const switchedVehicle = await manager.cycleVehicle();

    expect(switchedVehicle.vehicleType).toBe("sedan");
    expect(manager.getActiveVehicle().vehicleType).toBe("sedan");
  });

  it("can transfer the active vehicle without disposing the abandoned runtime", () => {
    const starterVehicle = createManagedVehicleRuntime({
      vehicleType: "sedan",
      tuning: sedanTuning,
      runtime: createRuntime()
    });
    const hijackedVehicle = createManagedVehicleRuntime({
      vehicleType: "sports-car",
      tuning: sportsCarTuning,
      runtime: createRuntime()
    });
    const manager = createVehicleManager({
      activeVehicle: starterVehicle,
      availableVehicleTypes: ["sedan", "sports-car"],
      loadTuningProfile: vi.fn(async (vehicleType: string) =>
        vehicleType === "sports-car" ? sportsCarTuning : sedanTuning
      ),
      spawnVehicle: vi.fn(({ vehicleType, tuning }: { vehicleType: string; tuning: VehicleTuning }) =>
        createManagedVehicleRuntime({
          vehicleType,
          tuning,
          runtime: createRuntime()
        })
      )
    });

    expect(manager.setActiveVehicle(hijackedVehicle)).toBe(hijackedVehicle);
    expect(manager.getActiveVehicle()).toBe(hijackedVehicle);
    expect(starterVehicle.dispose).not.toHaveBeenCalled();
  });
});
