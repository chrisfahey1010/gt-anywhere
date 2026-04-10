import { Scene, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyHeatSceneTelemetry,
  createSceneHeatRuntime,
  disposeSceneHeatRuntime,
  updateSceneHeat
} from "../../src/rendering/scene/heat-scene-runtime";
import { syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";

describe("heat scene runtime smoke", () => {
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

  it("resets heat state across recreation while keeping readiness and world telemetry coherent", () => {
    const canvas = document.createElement("canvas");
    const telemetryVehicle = {
      mesh: {
        name: "starter-vehicle",
        position: Vector3.Zero()
      },
      vehicleType: "sedan"
    };

    const syncBaselineTelemetry = () => {
      syncWorldSceneTelemetry({
        activeVehicle: telemetryVehicle,
        canvas,
        fallbackCameraName: "starter-vehicle-camera",
        possessionMode: "vehicle",
        scene,
        spawnPoint: Vector3.Zero()
      });
    };

    scene.metadata = {
      activeCamera: "starter-vehicle-camera",
      pedestrianCount: 2,
      readinessMilestone: "controllable-vehicle",
      trafficVehicleCount: 1
    };
    canvas.dataset.activeCamera = "starter-vehicle-camera";
    canvas.dataset.pedestrianCount = "2";
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.trafficVehicleCount = "1";

    const firstRuntime = createSceneHeatRuntime();

    syncBaselineTelemetry();
    const firstEvents = updateSceneHeat({
      chaosEvents: [
        {
          impactSpeed: 10,
          propId: "prop-1",
          propType: "signpost",
          sourceId: "player-car",
          type: "prop.broken"
        }
      ],
      combatEvents: [
        {
          impactSpeed: 11.5,
          shotCount: 1,
          timestampSeconds: 1,
          type: "combat.weapon.fired",
          weaponId: "rifle"
        }
      ],
      currentTimeSeconds: 1,
      pedestrianEvents: [
        {
          pedestrianId: "ped-1",
          sourceId: "player",
          state: "struck",
          type: "pedestrian.struck"
        }
      ],
      runtime: firstRuntime
    });

    applyHeatSceneTelemetry({ canvas, events: firstEvents, runtime: firstRuntime, scene });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.trafficVehicleCount).toBe("1");
    expect(canvas.dataset.pedestrianCount).toBe("2");
    expect(canvas.dataset.heatLevel).toBe("3");
    expect(canvas.dataset.heatStage).toBe("high");
    expect(canvas.dataset.heatRecentEvents).toContain("pedestrian.struck");
    expect((scene.metadata as Record<string, unknown>).trafficVehicleCount).toBe(1);
    expect((scene.metadata as Record<string, unknown>).pedestrianCount).toBe(2);

    disposeSceneHeatRuntime(firstRuntime);

    const restartedRuntime = createSceneHeatRuntime();

    syncBaselineTelemetry();
    applyHeatSceneTelemetry({ canvas, events: [], runtime: restartedRuntime, scene });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.trafficVehicleCount).toBe("1");
    expect(canvas.dataset.pedestrianCount).toBe("2");
    expect(canvas.dataset.heatLevel).toBe("0");
    expect(canvas.dataset.heatStage).toBe("calm");
    expect(canvas.dataset.heatRecentEvents).toBe("");
    expect(canvas.dataset.heatStageChanged).toBe("false");

    disposeSceneHeatRuntime(restartedRuntime);
  });

  it("keeps heat calm when only camera and possession telemetry changes are synced", () => {
    const canvas = document.createElement("canvas");
    const telemetryVehicle = {
      mesh: {
        name: "starter-vehicle",
        position: Vector3.Zero()
      },
      vehicleType: "sedan"
    };
    const runtime = createSceneHeatRuntime();

    scene.metadata = {
      readinessMilestone: "controllable-vehicle"
    };

    syncWorldSceneTelemetry({
      activeVehicle: telemetryVehicle,
      canvas,
      fallbackCameraName: "starter-vehicle-camera",
      possessionMode: "vehicle",
      scene,
      spawnPoint: Vector3.Zero()
    });

    applyHeatSceneTelemetry({
      canvas,
      events: updateSceneHeat({ runtime }),
      runtime,
      scene
    });

    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.heatLevel).toBe("0");
    expect(canvas.dataset.heatStage).toBe("calm");

    syncWorldSceneTelemetry({
      activeVehicle: telemetryVehicle,
      canvas,
      fallbackCameraName: "on-foot-camera",
      onFootActorId: "player-on-foot",
      possessionMode: "on-foot",
      scene,
      spawnPoint: Vector3.Zero()
    });

    applyHeatSceneTelemetry({
      canvas,
      events: updateSceneHeat({ runtime }),
      runtime,
      scene
    });

    expect(canvas.dataset.activeCamera).toBe("on-foot-camera");
    expect(canvas.dataset.possessionMode).toBe("on-foot");
    expect(canvas.dataset.onFootActorId).toBe("player-on-foot");
    expect(canvas.dataset.heatLevel).toBe("0");
    expect(canvas.dataset.heatStage).toBe("calm");

    disposeSceneHeatRuntime(runtime);
  });
});
