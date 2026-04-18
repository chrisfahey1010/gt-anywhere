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
import { createWorldNavigationSnapshot, syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";

describe("chaos scene runtime smoke", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;
  const assetRegistry = {
    props: {},
    vehicles: {},
    world: {}
  };

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

  it("resets chaos state across recreation while keeping readiness, navigation, possession, traffic, and pedestrian telemetry coherent", () => {
    const canvas = document.createElement("canvas");
    const manifest = {
      breakableProps: {
        props: [
          {
            chunkId: "chunk-0-0",
            headingDegrees: 0,
            id: "market-st-signpost-0-0",
            position: { x: 0, y: 0, z: 1.4 },
            propType: "signpost" as const,
            roadId: "market-st",
            startDistance: 18
          }
        ]
      }
    };
    const navigationManifest = {
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
          kind: "primary" as const,
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
    };

    const createSession = () => {
      const activeVehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), new Vector3(0, 0, 9));
      const activeVehicleMesh = activeVehicle.mesh as unknown as {
        name: string;
        position: Vector3;
        rotation: Vector3;
      };
      const runtime = createSceneChaosRuntime({
        assetRegistry: assetRegistry as any,
        manifest,
        parent: root,
        scene
      });
      const telemetryVehicle = {
        mesh: {
          name: activeVehicleMesh.name,
          position: activeVehicleMesh.position
        },
        vehicleType: activeVehicle.vehicleType
      };

      syncWorldSceneTelemetry({
        activeVehicle: telemetryVehicle,
        canvas,
        fallbackCameraName: "starter-vehicle-camera",
        possessionMode: "vehicle",
        scene,
        spawnPoint: Vector3.Zero()
      });

      return { activeVehicle, activeVehicleMesh, runtime, telemetryVehicle };
    };

    scene.metadata = {
      activeCamera: "starter-vehicle-camera",
      pedestrianCount: 2,
      readinessMilestone: "controllable-vehicle",
      trafficVehicleCount: 1
    };
    canvas.dataset.activeCamera = "starter-vehicle-camera";
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.pedestrianCount = "2";
    canvas.dataset.trafficVehicleCount = "1";

    const firstSession = createSession();
    const navigationBefore = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: firstSession.activeVehicleMesh.name,
          position: firstSession.activeVehicleMesh.position,
          rotation: firstSession.activeVehicleMesh.rotation
        },
        vehicleType: firstSession.activeVehicle.vehicleType
      },
      manifest: navigationManifest,
      possessionMode: "vehicle"
    });
    const firstEvents = updateSceneChaos({
      activeVehicle: firstSession.activeVehicle,
      deltaSeconds: 1 / 60,
      hijackableVehicles: [],
      runtime: firstSession.runtime,
      trafficVehicles: []
    });

    applyChaosSceneTelemetry({
      canvas,
      events: firstEvents,
      runtime: firstSession.runtime,
      scene,
      vehicles: [firstSession.activeVehicle]
    });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.trafficVehicleCount).toBe("1");
    expect(canvas.dataset.pedestrianCount).toBe("2");
    expect(canvas.dataset.damagedVehicleCount).toBe("1");
    expect(canvas.dataset.brokenPropCount).toBe("1");
    expect(canvas.dataset.chaosRecentEvents).toContain("prop.broken");
    expect((scene.metadata as Record<string, unknown>).trafficVehicleCount).toBe(1);
    expect((scene.metadata as Record<string, unknown>).pedestrianCount).toBe(2);

    disposeSceneChaosRuntime(firstSession.runtime);

    const restartedSession = createSession();

    applyChaosSceneTelemetry({
      canvas,
      events: [],
      runtime: restartedSession.runtime,
      scene,
      vehicles: [restartedSession.activeVehicle]
    });

    expect(restartedSession.activeVehicle.damageState).toEqual({
      accumulatedDamage: 0,
      normalizedSeverity: 0
    });
    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.possessionMode).toBe("vehicle");
    expect(canvas.dataset.trafficVehicleCount).toBe("1");
    expect(canvas.dataset.pedestrianCount).toBe("2");
    expect(canvas.dataset.damagedVehicleCount).toBe("0");
    expect(canvas.dataset.brokenPropCount).toBe("0");
    expect(canvas.dataset.chaosRecentEvents).toBe("");

    const navigationAfter = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: restartedSession.activeVehicleMesh.name,
          position: restartedSession.activeVehicleMesh.position,
          rotation: restartedSession.activeVehicleMesh.rotation
        },
        vehicleType: restartedSession.activeVehicle.vehicleType
      },
      manifest: navigationManifest,
      possessionMode: "vehicle"
    });

    expect(navigationAfter.snapshot.streetLabel).toBe(navigationBefore.snapshot.streetLabel);
    disposeSceneChaosRuntime(restartedSession.runtime);
  });
});
