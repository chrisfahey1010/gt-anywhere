import { Scene, TransformNode } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPedestrianSystem } from "../../src/pedestrians/runtime/pedestrian-system";
import type { SlicePedestrianPlan } from "../../src/world/chunks/slice-manifest";

describe("pedestrian system", () => {
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

  function createPlan(): SlicePedestrianPlan {
    return {
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
        },
        {
          chunkId: "chunk-0-0",
          headingDegrees: 180,
          id: "ped-2",
          initialState: "waiting",
          offsetFromRoad: -12,
          position: { x: 4, y: 0, z: 3 },
          roadId: "market-st",
          startDistance: 18
        }
      ]
    };
  }

  it("creates placeholder pedestrian actors from the manifest plan and disposes them cleanly", () => {
    const system = createPedestrianSystem({ parent: root, plan: createPlan(), scene });
    const pedestrians = system.getPedestrians();

    expect(pedestrians).toHaveLength(2);
    expect(pedestrians[0]?.mesh.metadata).toMatchObject({
      interactionRole: "pedestrian",
      pedestrianId: "ped-1",
      pedestrianState: "standing"
    });
    expect(system.consumeEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pedestrianId: "ped-1",
          type: "pedestrian.spawned"
        }),
        expect.objectContaining({
          pedestrianId: "ped-2",
          type: "pedestrian.spawned"
        })
      ])
    );

    const firstMesh = pedestrians[0]?.mesh;
    system.dispose();

    expect(firstMesh?.isDisposed()).toBe(true);
  });

  it("advances calm states and reacts to explicit threats and collision inputs", () => {
    const system = createPedestrianSystem({
      parent: root,
      plan: {
        pedestrians: [
          {
            chunkId: "chunk-0-0",
            headingDegrees: 0,
            id: "ped-1",
            initialState: "walking",
            offsetFromRoad: 12,
            position: { x: 0, y: 0, z: 0 },
            roadId: "market-st",
            startDistance: 8
          }
        ]
      },
      scene
    });
    const pedestrian = system.getPedestrians()[0];

    if (!pedestrian) {
      throw new Error("Expected pedestrian runtime to be created");
    }

    const startingZ = pedestrian.mesh.position.z;

    system.update({ deltaSeconds: 0.8, threats: [] });

    expect(pedestrian.getSnapshot().currentState).toBe("walking");
    expect(pedestrian.mesh.position.z).not.toBe(startingZ);

    const panicEvents = system.update({
      deltaSeconds: 0.1,
      threats: [
        {
          id: "starter-vehicle",
          kind: "vehicle",
          position: { x: 0, y: 0, z: 1.2 },
          radius: 6
        }
      ]
    });

    expect(pedestrian.getSnapshot().currentState).toBe("panic");
    expect(panicEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pedestrianId: "ped-1",
          sourceId: "starter-vehicle",
          type: "pedestrian.panicked"
        })
      ])
    );

    const struckEvents = system.update({
      collisions: [
        {
          impactSpeed: 12,
          pedestrianId: "ped-1",
          sourceId: "starter-vehicle"
        }
      ],
      deltaSeconds: 0.1,
      threats: []
    });

    expect(pedestrian.getSnapshot().currentState).toBe("struck");
    expect(struckEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pedestrianId: "ped-1",
          sourceId: "starter-vehicle",
          type: "pedestrian.struck"
        })
      ])
    );
  });
});
