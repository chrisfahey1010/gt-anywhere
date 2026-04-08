import { Scene, TargetCamera, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canSwitchControlledVehicle,
  sanitizeWorldRuntimeInputFrame,
  syncWorldSceneTelemetry
} from "../../src/rendering/scene/world-scene-runtime";

describe("world scene runtime helpers", () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it("uses explicit camera names for world-scene telemetry", () => {
    const camera = new TargetCamera("starter-vehicle-camera", Vector3.Zero(), scene);
    const canvas = document.createElement("canvas");
    scene.activeCamera = camera;
    scene.metadata = {};

    syncWorldSceneTelemetry({
      activeVehicle: {
        mesh: {
          name: "vehicle-runtime",
          position: new Vector3(4, 0, -2)
        },
        vehicleType: "sedan"
      },
      canvas,
      fallbackCameraName: "fallback-camera",
      possessionMode: "vehicle",
      scene,
      spawnPoint: Vector3.Zero()
    });

    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(scene.metadata.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.activeCamera).not.toBe(camera.getClassName());
  });

  it("blocks exit interaction while a vehicle switch handoff is in flight", () => {
    const frame = {
      interactionRequested: true,
      onFootMovement: {
        forward: 0,
        right: 0
      },
      switchVehicleRequested: true,
      vehicleControls: {
        throttle: 0,
        brake: 0,
        steering: 0,
        handbrake: false,
        lookX: 0,
        lookY: 0,
        lookInputSource: "none" as const
      }
    };

    expect(canSwitchControlledVehicle({ possessionMode: "vehicle", vehicleSwitchInFlight: false })).toBe(true);
    expect(canSwitchControlledVehicle({ possessionMode: "on-foot", vehicleSwitchInFlight: false })).toBe(false);

    expect(
      sanitizeWorldRuntimeInputFrame(frame, {
        possessionMode: "vehicle",
        vehicleSwitchInFlight: true
      })
    ).toEqual({
      ...frame,
      interactionRequested: false
    });
  });
});
