import { Color3, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import {
  applyChaosSceneTelemetry,
  createSceneChaosRuntime,
  disposeSceneChaosRuntime,
  updateSceneChaos,
  type SceneChaosVehicleActor
} from "../../src/rendering/scene/chaos-scene-runtime";

describe("chaos scene runtime", () => {
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

  function createVehicle(name: string, position: Vector3, speed: Vector3): SceneChaosVehicleActor {
    const mesh = MeshBuilder.CreateBox(name, { width: 1.8, height: 1.4, depth: 4.5 }, scene);
    const material = new StandardMaterial(`${name}-material`, scene);

    material.diffuseColor = Color3.FromHexString("#f25f5c");
    mesh.material = material;
    mesh.parent = root;
    mesh.position.copyFrom(position);
    mesh.metadata = {
      interactionRole: "active"
    };

    return {
      damageState: createPristineVehicleDamageState(),
      mesh,
      physicsAggregate: {
        body: {
          getLinearVelocity: () => speed.clone()
        }
      },
      tuning: {
        color: "#f25f5c",
        damage: {
          durability: 100,
          impactSpeedThreshold: 7
        },
        dimensions: {
          width: 1.8,
          height: 1.4,
          length: 4.5
        }
      },
      vehicleType: "sedan"
    };
  }

  it("creates breakable prop scene handles from the manifest plan and disposes them cleanly", () => {
    const runtime = createSceneChaosRuntime({
      manifest: {
        breakableProps: {
          props: [
            {
              chunkId: "chunk-0-0",
              headingDegrees: 0,
              id: "market-st-signpost-0-0",
              position: { x: 0, y: 0, z: 12 },
              propType: "signpost",
              roadId: "market-st",
              startDistance: 18
            }
          ]
        }
      },
      parent: root,
      scene
    });

    expect(runtime).not.toBeNull();

    if (runtime === null) {
      return;
    }

    const [prop] = runtime.getBreakableProps();

    expect(prop).toMatchObject({
      breakState: "intact",
      id: "market-st-signpost-0-0",
      propType: "signpost"
    });
    expect(prop.mesh.metadata).toMatchObject({
      breakState: "intact",
      breakablePropId: "market-st-signpost-0-0",
      interactionRole: "breakable-prop",
      propType: "signpost"
    });

    disposeSceneChaosRuntime(runtime);
    expect(prop.mesh.isDisposed()).toBe(true);
  });

  it("updates damage and break state from explicit scene actors instead of controller state", () => {
    const runtime = createSceneChaosRuntime({
      manifest: {
        breakableProps: {
          props: [
            {
              chunkId: "chunk-0-0",
              headingDegrees: 0,
              id: "market-st-signpost-0-0",
              position: { x: 0, y: 0, z: 1.4 },
              propType: "signpost",
              roadId: "market-st",
              startDistance: 18
            }
          ]
        }
      },
      parent: root,
      scene
    });

    if (runtime === null) {
      throw new Error("Expected chaos runtime");
    }

    const activeVehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), new Vector3(0, 0, 9));

    const firstEvents = updateSceneChaos({
      activeVehicle,
      deltaSeconds: 1 / 60,
      hijackableVehicles: [],
      runtime,
      trafficVehicles: []
    });

    expect(firstEvents.map((event) => event.type).sort()).toEqual(["prop.broken", "vehicle.damaged"]);
    expect(activeVehicle.damageState).toEqual(
      expect.objectContaining({
        accumulatedDamage: 2,
        normalizedSeverity: 0.02
      })
    );
    expect(activeVehicle.mesh.metadata).toMatchObject({
      damageNormalizedSeverity: 0.02,
      damageSeverity: "minor",
      interactionRole: "active"
    });

    const [brokenProp] = runtime.getBreakableProps();

    expect(brokenProp).toMatchObject({
      breakState: "broken",
      id: "market-st-signpost-0-0"
    });
    expect(brokenProp.mesh.metadata).toMatchObject({
      breakState: "broken",
      interactionRole: "breakable-prop"
    });
    expect(brokenProp.mesh.checkCollisions).toBe(false);

    expect(
      updateSceneChaos({
        activeVehicle,
        deltaSeconds: 1 / 60,
        hijackableVehicles: [],
        runtime,
        trafficVehicles: []
      })
    ).toEqual([]);
  });

  it("adds additive chaos telemetry without changing readiness or camera fields", () => {
    const runtime = createSceneChaosRuntime({
      manifest: {
        breakableProps: {
          props: [
            {
              chunkId: "chunk-0-0",
              headingDegrees: 0,
              id: "market-st-signpost-0-0",
              position: { x: 0, y: 0, z: 1.4 },
              propType: "signpost",
              roadId: "market-st",
              startDistance: 18
            }
          ]
        }
      },
      parent: root,
      scene
    });

    if (runtime === null) {
      throw new Error("Expected chaos runtime");
    }

    const activeVehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), new Vector3(0, 0, 9));
    const updateEvents = updateSceneChaos({
      activeVehicle,
      deltaSeconds: 1 / 60,
      hijackableVehicles: [],
      runtime,
      trafficVehicles: []
    });
    const canvas = document.createElement("canvas");

    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = "starter-vehicle-camera";
    scene.metadata = {
      activeCamera: "starter-vehicle-camera",
      readinessMilestone: "controllable-vehicle"
    };

    applyChaosSceneTelemetry({
      canvas,
      events: [
        ...updateEvents,
        updateEvents[0]!,
        updateEvents[1]!,
        updateEvents[0]!
      ],
      runtime,
      scene,
      vehicles: [activeVehicle]
    });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.damagedVehicleCount).toBe("1");
    expect(canvas.dataset.brokenPropCount).toBe("1");
    expect(canvas.dataset.chaosRecentEvents).toBe("vehicle.damaged,prop.broken,vehicle.damaged,prop.broken");
    expect((scene.metadata as Record<string, unknown>).readinessMilestone).toBe("controllable-vehicle");
    expect((scene.metadata as Record<string, unknown>).damagedVehicleCount).toBe(1);
    expect((scene.metadata as Record<string, unknown>).brokenPropCount).toBe(1);
  });
});
