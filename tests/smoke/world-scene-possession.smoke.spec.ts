import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";
import { createOnFootCamera } from "../../src/sandbox/on-foot/create-on-foot-camera";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import {
  createPlayerVehicleController,
  type PlayerInputFrame
} from "../../src/vehicles/controllers/player-vehicle-controller";

describe("world scene possession smoke", () => {
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

  it("keeps real possession telemetry coherent across exit and re-entry", () => {
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
      },
      vehicleType: "sedan"
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
    const canvas = document.createElement("canvas");
    const spawnPoint = vehicleMesh.position.clone();
    let onFootCamera = null as ReturnType<typeof createOnFootCamera> | null;
    scene.metadata = {};

    const syncTelemetry = () => {
      syncWorldSceneTelemetry({
        activeVehicle: vehicleRuntime,
        canvas,
        fallbackCameraName: vehicleCamera.name,
        onFootActorId: possessionRuntime.getOnFootRuntime()?.mesh.name,
        possessionMode: possessionRuntime.getMode(),
        scene,
        spawnPoint
      });
    };

    syncTelemetry();
    expect(canvas.dataset.readyMilestone).toBeUndefined();
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");

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

    syncTelemetry();
    expect(canvas.dataset.possessionMode).toBe("on-foot");
    expect(canvas.dataset.activeCamera).toBe("on-foot-camera");
    expect(canvas.dataset.onFootActorId).toBe("on-foot-actor");

    possessionRuntime.getOnFootRuntime()!.mesh.position.copyFromFloats(
      0.4,
      possessionRuntime.getOnFootRuntime()!.mesh.position.y,
      -0.4
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    currentInputFrame = controller.captureInputFrame();
    const reentryUpdate = possessionRuntime.update(currentInputFrame, 1 / 60);

    if (reentryUpdate.transition === "reentered") {
      controller.bindVehicle(vehicleMesh);
      vehicleCamera.setVehicleTarget(vehicleMesh);
      scene.activeCamera = vehicleCamera;
    }

    syncTelemetry();
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.onFootActorId).toBe("");

    possessionRuntime.dispose();
    controller.dispose();
  });
});
