import { TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPedestrianSceneTelemetry,
  createScenePedestrianSystem,
  disposeScenePedestrianSystem,
  updateScenePedestrians
} from "../../src/rendering/scene/pedestrian-scene-runtime";

describe("pedestrian scene runtime", () => {
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

  it("creates a scene pedestrian system from the manifest plan and disposes it cleanly", () => {
    const dispose = vi.fn();
    const createPedestrianSystem = vi.fn(() => ({
      consumeEvents: () => [],
      dispose,
      getPedestrians: () => [],
      update: () => []
    }));

    const pedestrianSystem = createScenePedestrianSystem({
      createPedestrianSystem,
      manifest: {
        pedestrians: {
          pedestrians: [
            {
              chunkId: "chunk-0-0",
              headingDegrees: 0,
              id: "ped-1",
              initialState: "standing",
              offsetFromRoad: 12,
              position: { x: 0, y: 0, z: 0 },
              roadId: "market-st",
              startDistance: 8
            }
          ]
        }
      },
      parent: root,
      scene
    });

    expect(createPedestrianSystem).toHaveBeenCalledWith({
      parent: root,
      plan: {
        pedestrians: [
          expect.objectContaining({
            id: "ped-1"
          })
        ]
      },
      scene
    });

    disposeScenePedestrianSystem(pedestrianSystem);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("updates pedestrians from explicit world actors instead of player controller state", () => {
    const update = vi.fn(() => []);
    const pedestrianSystem = {
      consumeEvents: () => [],
      dispose: () => {},
      getPedestrians: () => [
        {
          id: "ped-1",
          mesh: {
            position: new Vector3(0, 0.85, 1.3)
          }
        }
      ],
      update
    } as unknown as Parameters<typeof updateScenePedestrians>[0]["pedestrianSystem"];

    updateScenePedestrians({
      activeVehicle: {
        mesh: {
          name: "starter-vehicle",
          position: new Vector3(0, 1.7, 0)
        },
        physicsAggregate: {
          body: {
            getLinearVelocity: () => new Vector3(0, 0, 8)
          }
        }
      },
      deltaSeconds: 1 / 60,
      onFootActor: {
        mesh: {
          name: "on-foot-actor",
          position: new Vector3(3, 0.9, 0)
        }
      },
      pedestrianSystem
    });

    expect(update).toHaveBeenCalledWith({
      collisions: [
        expect.objectContaining({
          impactSpeed: expect.any(Number),
          pedestrianId: "ped-1",
          sourceId: "starter-vehicle"
        })
      ],
      deltaSeconds: 1 / 60,
      threats: expect.arrayContaining([
        expect.objectContaining({
          id: "starter-vehicle",
          kind: "vehicle"
        }),
        expect.objectContaining({
          id: "on-foot-actor",
          kind: "player"
        })
      ])
    });
  });

  it("adds pedestrian telemetry in an additive way without changing readiness or camera fields", () => {
    const canvas = document.createElement("canvas");

    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = "starter-vehicle-camera";
    scene.metadata = {
      activeCamera: "starter-vehicle-camera",
      readinessMilestone: "controllable-vehicle"
    };

    applyPedestrianSceneTelemetry({
      canvas,
      events: [
        {
          pedestrianId: "ped-1",
          sourceId: "starter-vehicle",
          state: "panic",
          type: "pedestrian.panicked"
        }
      ],
      pedestrianSystem: {
        consumeEvents: () => [],
        dispose: () => {},
        getPedestrians: () => [
          {
            getSnapshot: () => ({
              calmState: "standing",
              currentState: "panic",
              position: { x: 0, y: 0.85, z: 0 }
            }),
            id: "ped-1",
            mesh: {
              position: new Vector3(0, 0.85, 0)
            }
          },
          {
            getSnapshot: () => ({
              calmState: "walking",
              currentState: "walking",
              position: { x: 4, y: 0.85, z: 3 }
            }),
            id: "ped-2",
            mesh: {
              position: new Vector3(4, 0.85, 3)
            }
          }
        ]
      } as unknown as Parameters<typeof applyPedestrianSceneTelemetry>[0]["pedestrianSystem"],
      scene
    });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.pedestrianCount).toBe("2");
    expect(canvas.dataset.pedestrianStates).toContain("panic:1");
    expect(canvas.dataset.pedestrianRecentEvents).toBe("pedestrian.panicked");
    expect((scene.metadata as Record<string, unknown>).readinessMilestone).toBe("controllable-vehicle");
    expect((scene.metadata as Record<string, unknown>).pedestrianCount).toBe(2);
    expect((scene.metadata as Record<string, unknown>).pedestrianIds).toEqual(["ped-1", "ped-2"]);
  });
});
