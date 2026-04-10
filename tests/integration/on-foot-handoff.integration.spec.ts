import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOnFootCamera } from "../../src/sandbox/on-foot/create-on-foot-camera";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";
import {
  createPlayerVehicleController,
  type PlayerInputFrame
} from "../../src/vehicles/controllers/player-vehicle-controller";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";

describe("on-foot handoff integration", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    scene.dispose();
    root.dispose();
    engine.dispose();
  });

  it("swaps camera and control ownership across exit, on-foot movement, and re-entry", () => {
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

    const vehicleMesh = MeshBuilder.CreateBox(
      "vehicle-runtime",
      {
        width: 2,
        height: 1.6,
        depth: 4.5
      },
      scene
    );
    vehicleMesh.parent = root;
    vehicleMesh.position.copyFromFloats(0, 1.7, 0);

    const linearVelocity = new Vector3(0.1, 0, 0.1);
    const controller = createPlayerVehicleController({ eventTarget: window });
    const vehicleRuntime = {
      mesh: vehicleMesh,
      physicsAggregate: {
        body: {
          getLinearVelocity: () => linearVelocity.clone(),
          setAngularVelocity: vi.fn(),
          setLinearVelocity: vi.fn((value: Vector3) => {
            linearVelocity.copyFrom(value);
          })
        }
      }
    };
    const possessionRuntime = createPlayerPossessionRuntime({
      blockingMeshes: [],
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
    possessionRuntime.bindActiveVehicle(vehicleRuntime);
    controller.bindVehicle(vehicleMesh);

    let currentInputFrame: PlayerInputFrame = controller.captureInputFrame();
    const vehicleCamera = createStarterVehicleCamera({
      scene,
      target: vehicleMesh,
      controller,
      getInputState: () => currentInputFrame.vehicleControls
    });
    let onFootCamera = null as ReturnType<typeof createOnFootCamera> | null;

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    currentInputFrame = controller.captureInputFrame();
    const exitUpdate = possessionRuntime.update(currentInputFrame, 1 / 60);

    if (exitUpdate.transition === "exited") {
      controller.unbindVehicle();
      onFootCamera = createOnFootCamera({
        scene,
        target: possessionRuntime.getOnFootRuntime()!.mesh
      });
      onFootCamera.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());
    }

    expect(exitUpdate.transition).toBe("exited");
    expect(scene.activeCamera).toBe(onFootCamera);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    currentInputFrame = controller.captureInputFrame();
    possessionRuntime.update(currentInputFrame, 1 / 10);
    onFootCamera?.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());

    expect(currentInputFrame.vehicleControls.throttle).toBe(0);
    expect(currentInputFrame.onFootMovement.forward).toBe(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit1" }));
    window.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    currentInputFrame = controller.captureInputFrame();
    const onFootCombatUpdate = possessionRuntime.update(currentInputFrame, 1 / 60);

    expect(currentInputFrame.combatControls).toEqual({
      firePressed: true,
      weaponCycleDirection: 0,
      weaponSlotRequested: 0
    });
    expect(onFootCombatUpdate.transition).toBe("none");
    expect(onFootCombatUpdate.combatEnabled).toBe(true);

    window.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));

    possessionRuntime.getOnFootRuntime()!.mesh.position.copyFromFloats(
      0,
      possessionRuntime.getOnFootRuntime()!.mesh.position.y,
      -0.8
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    currentInputFrame = controller.captureInputFrame();
    const reentryUpdate = possessionRuntime.update(currentInputFrame, 1 / 60);

    if (reentryUpdate.transition === "reentered") {
      controller.bindVehicle(vehicleMesh);
      vehicleCamera.setVehicleTarget(vehicleMesh);
      scene.activeCamera = vehicleCamera;
    }

    expect(reentryUpdate.transition).toBe("reentered");
    expect(scene.activeCamera).toBe(vehicleCamera);

    currentInputFrame = controller.captureInputFrame();
    expect(currentInputFrame.vehicleControls.throttle).toBe(1);

    possessionRuntime.dispose();
    controller.dispose();
  });
});
