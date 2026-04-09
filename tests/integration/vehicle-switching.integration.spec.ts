import { MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import {
  createPlayerVehicleController,
  type VehicleControlState
} from "../../src/vehicles/controllers/player-vehicle-controller";
import type { StarterVehicleRuntime } from "../../src/vehicles/physics/create-starter-vehicle";
import {
  createManagedVehicleRuntime,
  createVehicleManager
} from "../../src/vehicles/physics/vehicle-manager";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createTuning(name: string, color: string): VehicleTuning {
  return {
    name,
    mass: 1200,
    color,
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    damage: {
      durability: name === "Sports Car" ? 60 : 100,
      impactSpeedThreshold: name === "Sports Car" ? 8 : 7
    },
    model: {
      bodyStyle: name === "Sports Car" ? "sports-car" : "sedan"
    },
    dimensions: {
      width: 1.8,
      height: 1.4,
      length: 4.5
    }
  };
}

describe("vehicle switching integration", () => {
  let engine: NullEngine | null = null;
  let scene: Scene | null = null;

  afterEach(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    scene?.dispose();
    engine?.dispose();
    scene = null;
    engine = null;
  });

  it("preserves velocity and reattaches the controller and camera after a vehicle switch", async () => {
    engine = new NullEngine();
    scene = new Scene(engine);

    const sedanTuning = createTuning("Sedan", "#f25f5c");
    const sportsCarTuning = createTuning("Sports Car", "#ff0000");
    const initialPosition = new Vector3(8, 1.2, -14);
    const initialRotation = new Vector3(0, Math.PI / 4, 0);
    const initialLinearVelocity = new Vector3(15, 0, 6);
    const initialAngularVelocity = new Vector3(0, 0.55, 0);
    let lastControlState: VehicleControlState | null = null;
    const controller = createPlayerVehicleController({ eventTarget: window });

    const createRuntime = (
      name: string,
      state: {
        position: Vector3;
        rotation: Vector3;
        linearVelocity: Vector3;
        angularVelocity: Vector3;
      }
    ): StarterVehicleRuntime => {
      const mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene!);
      const linearVelocity = state.linearVelocity.clone();
      const angularVelocity = state.angularVelocity.clone();

      mesh.position.copyFrom(state.position);
      mesh.rotation.copyFrom(state.rotation);

      const physicsBody = {
        dispose: () => {},
        getAngularVelocity: () => angularVelocity.clone(),
        getLinearVelocity: () => linearVelocity.clone(),
        getLinearVelocityToRef: (ref: Vector3) => {
          ref.copyFrom(linearVelocity);
        },
        setAngularVelocity: (value: Vector3) => {
          angularVelocity.copyFrom(value);
        },
        setTargetTransform: vi.fn(),
        setLinearVelocity: (value: Vector3) => {
          linearVelocity.copyFrom(value);
        }
      };

      mesh.physicsBody = physicsBody as unknown as typeof mesh.physicsBody;

      return {
        mesh,
        physicsAggregate: {
          body: physicsBody
        } as unknown as StarterVehicleRuntime["physicsAggregate"],
        update: () => {
          lastControlState = controller.getState();
        },
        dispose: vi.fn(() => {
          mesh.dispose();
        })
      };
    };

    const initialVehicle = createManagedVehicleRuntime({
      vehicleType: "sedan",
      tuning: sedanTuning,
      runtime: createRuntime("sedan-vehicle", {
        position: initialPosition,
        rotation: initialRotation,
        linearVelocity: initialLinearVelocity,
        angularVelocity: initialAngularVelocity
      })
    });
    const manager = createVehicleManager({
      activeVehicle: initialVehicle,
      availableVehicleTypes: ["sedan", "sports-car"],
      loadTuningProfile: async (vehicleType: string) =>
        vehicleType === "sports-car" ? sportsCarTuning : sedanTuning,
      spawnVehicle: ({ vehicleType }) =>
        createRuntime(`${vehicleType}-vehicle`, {
          position: Vector3.Zero(),
          rotation: Vector3.Zero(),
          linearVelocity: Vector3.Zero(),
          angularVelocity: Vector3.Zero()
        })
    });

    controller.bindVehicle(initialVehicle.mesh);
    const camera = createStarterVehicleCamera({ scene, target: initialVehicle.mesh, controller });

    manager.onVehicleSwitched((event) => {
      controller.unbindVehicle();
      controller.bindVehicle(event.activeVehicle.mesh);
      camera.setVehicleTarget(event.activeVehicle.mesh);
    });

    for (let frame = 0; frame < 5; frame += 1) {
      scene.render();
    }

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));

    const switchedVehicle = await manager.switchVehicle("sports-car");

    switchedVehicle.update();
    expect(switchedVehicle.mesh.position.equalsWithEpsilon(initialPosition)).toBe(true);
    expect(switchedVehicle.mesh.rotation.equalsWithEpsilon(initialRotation)).toBe(true);
    expect(switchedVehicle.physicsAggregate.body.getLinearVelocity().equalsWithEpsilon(initialLinearVelocity)).toBe(true);
    expect(switchedVehicle.physicsAggregate.body.getAngularVelocity().equalsWithEpsilon(initialAngularVelocity)).toBe(true);
    expect(lastControlState).toEqual(expect.objectContaining({ throttle: 1 }));

    const lookTargetBeforeMove = camera.getTarget().clone();
    switchedVehicle.mesh.position.x += 18;

    for (let frame = 0; frame < 20; frame += 1) {
      scene.render();
    }

    expect(camera.getTarget().x).toBeGreaterThan(lookTargetBeforeMove.x + 8);
    controller.dispose();
  });
});
