import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOnFootCamera } from "../../src/sandbox/on-foot/create-on-foot-camera";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import {
  createPlayerVehicleController,
  type PlayerInputFrame,
  type VehicleControlState
} from "../../src/vehicles/controllers/player-vehicle-controller";
import {
  createManagedVehicleRuntime,
  createVehicleManager,
  type ManagedVehicleRuntime
} from "../../src/vehicles/physics/vehicle-manager";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createTuning(name: string, vehicleType: ManagedVehicleRuntime["vehicleType"]): VehicleTuning {
  return {
    color: vehicleType === "sports-car" ? "#ff0000" : "#f25f5c",
    dimensions: {
      height: 1.4,
      length: 4.5,
      width: 1.8
    },
    mass: 1200,
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    damage: {
      durability: vehicleType === "sports-car" ? 60 : 100,
      impactSpeedThreshold: vehicleType === "sports-car" ? 8 : 7
    },
    model: {
      bodyStyle: vehicleType === "sports-car" ? "sports-car" : "sedan"
    },
    name
  };
}

describe("vehicle hijack integration", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    scene.dispose();
    root.dispose();
    engine.dispose();
  });

  it("keeps camera, control, and abandoned-vehicle continuity across a hijack", () => {
    const ground = MeshBuilder.CreateBox(
      "ground",
      {
        width: 40,
        height: 0.5,
        depth: 40
      },
      scene
    );
    ground.parent = root;
    ground.position.y = 0.25;

    let lastStarterControls: VehicleControlState | null = null;
    let lastHijackedControls: VehicleControlState | null = null;

    const createRuntime = (
      name: string,
      vehicleType: ManagedVehicleRuntime["vehicleType"],
      position: Vector3,
      setLastControls: (controls: VehicleControlState) => void
    ): ManagedVehicleRuntime => {
      const mesh = MeshBuilder.CreateBox(name, { width: 2, height: 1.6, depth: 4.5 }, scene);
      mesh.parent = root;
      mesh.position.copyFrom(position);
      const linearVelocity = Vector3.Zero();

      return createManagedVehicleRuntime({
        vehicleType,
        tuning: createTuning(vehicleType === "sports-car" ? "Sports Car" : "Sedan", vehicleType),
        runtime: {
          mesh,
          physicsAggregate: {
            body: {
              getAngularVelocity: () => Vector3.Zero(),
              getLinearVelocity: () => linearVelocity.clone(),
              setAngularVelocity: vi.fn(),
              setLinearVelocity: vi.fn((value: Vector3) => {
                linearVelocity.copyFrom(value);
              })
            }
          } as unknown as ManagedVehicleRuntime["physicsAggregate"],
          update: (controls?: VehicleControlState) => {
            if (controls) {
              setLastControls(controls);
            }
          },
          dispose: vi.fn()
        }
      });
    };

    const starterVehicle = createRuntime(
      "starter-vehicle-spawn-0",
      "sedan",
      new Vector3(0, 1.7, 0),
      (controls) => {
        lastStarterControls = controls;
      }
    );
    const hijackableVehicle = createRuntime(
      "hijackable-vehicle-market-st-secondary-0-1",
      "sports-car",
      new Vector3(0, 1.7, 2.6),
      (controls) => {
        lastHijackedControls = controls;
      }
    );
    const manager = createVehicleManager({
      activeVehicle: starterVehicle,
      availableVehicleTypes: ["sedan", "sports-car"],
      loadTuningProfile: vi.fn(async (vehicleType: string) =>
        createTuning(vehicleType === "sports-car" ? "Sports Car" : "Sedan", vehicleType)
      ),
      spawnVehicle: vi.fn(({ vehicleType, tuning }: { vehicleType: string; tuning: VehicleTuning }) =>
        createManagedVehicleRuntime({
          vehicleType,
          tuning,
          runtime: {
            mesh: MeshBuilder.CreateBox(`spawned-${vehicleType}`, { size: 1 }, scene),
              physicsAggregate: {
                body: {
                  getAngularVelocity: () => Vector3.Zero(),
                  getLinearVelocity: () => Vector3.Zero(),
                  setAngularVelocity: () => {},
                  setLinearVelocity: () => {}
                }
              } as unknown as ManagedVehicleRuntime["physicsAggregate"],
            update: () => {},
            dispose: vi.fn()
          }
        })
      )
    });
    let hijackableVehicles: ManagedVehicleRuntime[] = [hijackableVehicle];
    const controller = createPlayerVehicleController({ eventTarget: window });
    const possessionRuntime = createPlayerPossessionRuntime({
      blockingMeshes: [],
      getInteractableVehicles: () => hijackableVehicles,
      hijackDurationSeconds: 0.25,
      parent: root,
      scene,
      sliceBounds: {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
      },
      surfaceMeshes: [ground]
    });
    possessionRuntime.bindActiveVehicle(manager.getActiveVehicle());
    controller.bindVehicle(starterVehicle.mesh);

    let currentInputFrame: PlayerInputFrame = controller.captureInputFrame();
    const vehicleCamera = createStarterVehicleCamera({
      scene,
      target: starterVehicle.mesh,
      controller,
      getInputState: () => currentInputFrame.vehicleControls
    });
    let onFootCamera = null as ReturnType<typeof createOnFootCamera> | null;

    const applyUpdate = (deltaSeconds: number) => {
      const update = possessionRuntime.update(currentInputFrame, deltaSeconds);

      if (update.transition === "exited") {
        controller.unbindVehicle();
        onFootCamera = createOnFootCamera({
          scene,
          target: possessionRuntime.getOnFootRuntime()!.mesh
        });
        onFootCamera.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());
      }

      if (update.transition === "hijacked" && update.targetVehicle) {
        const previousVehicle = manager.getActiveVehicle();
        const nextVehicle = update.targetVehicle as ManagedVehicleRuntime;

        hijackableVehicles = hijackableVehicles.filter((vehicle) => vehicle !== nextVehicle);
        hijackableVehicles.push(previousVehicle);
        manager.setActiveVehicle(nextVehicle);
        possessionRuntime.bindActiveVehicle(nextVehicle);
        controller.bindVehicle(nextVehicle.mesh);
        vehicleCamera.setVehicleTarget(nextVehicle.mesh);
        scene.activeCamera = vehicleCamera;
      }

      if (possessionRuntime.getMode() === "vehicle") {
        manager.getActiveVehicle().update(currentInputFrame.vehicleControls);
      } else {
        onFootCamera?.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());
      }

      return update;
    };

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    currentInputFrame = controller.captureInputFrame();

    expect(applyUpdate(1 / 60).transition).toBe("exited");
    expect(scene.activeCamera).toBe(onFootCamera);

    possessionRuntime.getOnFootRuntime()!.mesh.position.copyFromFloats(
      0.8,
      possessionRuntime.getOnFootRuntime()!.mesh.position.y,
      1.4
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    currentInputFrame = controller.captureInputFrame();

    expect(applyUpdate(1 / 60).transition).toBe("hijack-started");
    expect(scene.activeCamera).toBe(onFootCamera);

    currentInputFrame = controller.captureInputFrame();
    expect(applyUpdate(0.1).transition).toBe("none");

    currentInputFrame = controller.captureInputFrame();
    expect(applyUpdate(0.16).transition).toBe("hijacked");
    expect(manager.getActiveVehicle()).toBe(hijackableVehicle);
    expect(scene.activeCamera).toBe(vehicleCamera);
    expect(hijackableVehicles).toContain(starterVehicle);
    expect(starterVehicle.dispose).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    currentInputFrame = controller.captureInputFrame();
    applyUpdate(1 / 60);

    expect(lastHijackedControls).toEqual(expect.objectContaining({ throttle: 1 }));
    expect(lastStarterControls).toBeNull();

    possessionRuntime.dispose();
    controller.dispose();
  });
});
