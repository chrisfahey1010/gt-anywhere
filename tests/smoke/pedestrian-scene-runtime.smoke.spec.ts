import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyPedestrianSceneTelemetry,
  createScenePedestrianSystem,
  disposeScenePedestrianSystem,
  updateScenePedestrians
} from "../../src/rendering/scene/pedestrian-scene-runtime";
import { createWorldNavigationSnapshot, syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";

describe("pedestrian scene runtime smoke", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    root.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("keeps navigation and readiness contracts stable while pedestrian telemetry resets across scene recreation", () => {
    const canvas = document.createElement("canvas");
    const spawnPoint = Vector3.Zero();
    const activeVehicle = {
      mesh: {
        name: "starter-vehicle",
        position: new Vector3(0, 1.7, 0),
        rotation: new Vector3(0, 0, 0)
      },
      physicsAggregate: {
        body: {
          getLinearVelocity: () => new Vector3(0, 0, 8)
        }
      },
      vehicleType: "sedan"
    };

    scene.metadata = {
      activeCamera: "starter-vehicle-camera",
      readinessMilestone: "controllable-vehicle"
    };
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = "starter-vehicle-camera";

    syncWorldSceneTelemetry({
      activeVehicle,
      canvas,
      fallbackCameraName: "starter-vehicle-camera",
      possessionMode: "vehicle",
      scene,
      spawnPoint
    });

    const navigationBefore = createWorldNavigationSnapshot({
      activeVehicle,
      manifest: {
        bounds: {
          minX: -20,
          maxX: 20,
          minZ: -20,
          maxZ: 20
        },
        roads: [
          {
            id: "market-st",
            displayName: "Market Street",
            kind: "primary",
            width: 18,
            points: [
              { x: -18, y: 0, z: 0 },
              { x: 18, y: 0, z: 0 }
            ]
          }
        ],
        sceneMetadata: {
          displayName: "San Francisco, CA",
          districtName: "Downtown"
        }
      },
      possessionMode: "vehicle"
    });

    const manifest = {
      pedestrians: {
        pedestrians: [
          {
            chunkId: "chunk-0-0",
            headingDegrees: 0,
            id: "ped-1",
            initialState: "standing" as const,
            offsetFromRoad: 12,
            position: { x: 0, y: 0, z: 1.3 },
            roadId: "market-st",
            startDistance: 10
          }
        ]
      }
    };

    const firstSystem = createScenePedestrianSystem({ manifest, parent: root, scene });

    if (firstSystem === null) {
      throw new Error("Expected first pedestrian system");
    }

    const firstEvents = updateScenePedestrians({
      activeVehicle,
      deltaSeconds: 1 / 60,
      pedestrianSystem: firstSystem
    });

    applyPedestrianSceneTelemetry({
      canvas,
      events: firstEvents,
      pedestrianSystem: firstSystem,
      scene
    });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.pedestrianCount).toBe("1");
    expect(canvas.dataset.pedestrianRecentEvents).toContain("pedestrian.struck");
    expect((scene.metadata as Record<string, unknown>).pedestrianCount).toBe(1);

    disposeScenePedestrianSystem(firstSystem);

    const secondSystem = createScenePedestrianSystem({ manifest, parent: root, scene });

    if (secondSystem === null) {
      throw new Error("Expected recreated pedestrian system");
    }

    applyPedestrianSceneTelemetry({
      canvas,
      events: [],
      pedestrianSystem: secondSystem,
      scene
    });

    expect(secondSystem.getPedestrians()[0]?.getSnapshot().currentState).toBe("standing");
    expect(canvas.dataset.pedestrianRecentEvents).toBe("");
    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");

    const navigationAfter = createWorldNavigationSnapshot({
      activeVehicle,
      manifest: {
        bounds: {
          minX: -20,
          maxX: 20,
          minZ: -20,
          maxZ: 20
        },
        roads: [
          {
            id: "market-st",
            displayName: "Market Street",
            kind: "primary",
            width: 18,
            points: [
              { x: -18, y: 0, z: 0 },
              { x: 18, y: 0, z: 0 }
            ]
          }
        ],
        sceneMetadata: {
          displayName: "San Francisco, CA",
          districtName: "Downtown"
        }
      },
      possessionMode: "vehicle"
    });

    expect(navigationAfter.snapshot.streetLabel).toBe(navigationBefore.snapshot.streetLabel);
    disposeScenePedestrianSystem(secondSystem);
  });
});
