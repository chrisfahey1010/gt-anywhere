import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerVehicleController } from "../../src/vehicles/controllers/player-vehicle-controller";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import type { HeatRuntimeSnapshot } from "../../src/sandbox/heat/heat-runtime";
import { createSceneResponderRuntime } from "../../src/rendering/scene/responder-scene-runtime";
import type { SliceManifest, SpawnCandidate, TrafficVehiclePlan } from "../../src/world/chunks/slice-manifest";
import type { CreateTrafficVehicleOptions, TrafficVehicleRuntime } from "../../src/traffic/runtime/traffic-vehicle-factory";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createHeatSnapshot(overrides: Partial<HeatRuntimeSnapshot> = {}): HeatRuntimeSnapshot {
  return {
    captureTimeRemainingSeconds: null,
    escapeCooldownRemainingSeconds: 0,
    escapePhase: "inactive",
    failSignal: null,
    level: 2,
    maxScore: 100,
    pursuitPhase: "active",
    recentEvents: [],
    responderCount: 1,
    score: 32,
    stage: "elevated",
    stageThresholds: [0, 8, 24, 48, 72],
    ...overrides
  };
}

function createManifest(): { manifest: SliceManifest; spawnCandidate: SpawnCandidate } {
  const spawnCandidate: SpawnCandidate = {
    chunkId: "chunk-0-0",
    headingDegrees: 90,
    id: "spawn-0",
    laneIndex: 0,
    position: { x: -10, y: 0, z: 0 },
    roadId: "market-st",
    starterVehicle: {
      kind: "starter-car",
      placement: "lane-center",
      dimensions: {
        width: 2.2,
        height: 1.6,
        length: 4.6
      }
    },
    surface: "road"
  };

  return {
    manifest: {
      bounds: {
        minX: -100,
        maxX: 100,
        minZ: -60,
        maxZ: 60
      },
      chunks: [
        {
          id: "chunk-0-0",
          origin: { x: -100, y: 0, z: -60 },
          size: { width: 200, depth: 120 },
          roadIds: ["market-st"]
        }
      ],
      generationVersion: "test",
      location: {
        placeName: "San Francisco, CA",
        reuseKey: "san-francisco-ca",
        sessionKey: "san-francisco-ca-test"
      },
      roads: [
        {
          id: "market-st",
          displayName: "Market Street",
          kind: "primary",
          width: 18,
          points: [
            { x: -80, y: 0, z: 0 },
            { x: 80, y: 0, z: 0 }
          ]
        }
      ],
      sceneMetadata: {
        boundaryColor: "#8ec5fc",
        displayName: "San Francisco, CA",
        districtName: "Downtown",
        groundColor: "#263238",
        roadColor: "#f6d365"
      },
      seed: "test-seed",
      sliceId: "test-slice",
      spawnCandidates: [spawnCandidate]
    },
    spawnCandidate
  };
}

function createTuning(): VehicleTuning {
  return {
    color: "#1122ff",
    damage: {
      durability: 100,
      impactSpeedThreshold: 7
    },
    dimensions: {
      height: 1.6,
      length: 4.6,
      width: 2.2
    },
    mass: 1200,
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    model: {
      bodyStyle: "sedan"
    },
    name: "Responder Sedan"
  };
}

function createResponderVehicle(plan: TrafficVehiclePlan): TrafficVehicleRuntime {
  return {
    damageState: createPristineVehicleDamageState(),
    dispose: vi.fn(),
    id: plan.id,
    mesh: {
      metadata: {},
      name: `traffic-vehicle-${plan.id}`,
      position: new Vector3(plan.position.x, plan.position.y, plan.position.z),
      rotation: {
        y: 0
      }
    },
    physicsAggregate: {
      body: {
        getLinearVelocity: () => Vector3.Zero()
      }
    },
    tuning: createTuning(),
    update: vi.fn(),
    vehicleType: plan.vehicleType
  };
}

describe("scene responder runtime", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    scene.dispose();
    root.dispose();
    engine.dispose();
  });

  it("builds a bounded responder roster from heat level even before the scene has reported a live responder count", async () => {
    const { manifest, spawnCandidate } = createManifest();
    const controller = createPlayerVehicleController({ eventTarget: window });
    const spawnResponderVehicle = vi.fn((options: CreateTrafficVehicleOptions) => createResponderVehicle(options.plan));
    const runtime = await createSceneResponderRuntime({
      controller,
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      loadTuningProfile: vi.fn(async () => createTuning()),
      spawnResponderVehicle
    });
    const activeVehicle = {
      mesh: {
        name: "starter-vehicle",
        position: new Vector3(0, 0, 0),
        rotation: {
          y: 0
        }
      },
      vehicleType: "sedan"
    };

    const update = runtime.update({
      activeVehicle: activeVehicle as never,
      deltaSeconds: 1 / 60,
      heatSnapshot: createHeatSnapshot({ level: 2, pursuitPhase: "dispatching", responderCount: 0 })
    });

    expect(spawnResponderVehicle).toHaveBeenCalledTimes(2);
    expect(runtime.getVehicles()).toHaveLength(2);
    expect(runtime.getVehicles().map((vehicle) => vehicle.mesh.metadata?.interactionRole)).toEqual([
      "responder",
      "responder"
    ]);
    expect(update).toMatchObject({
      pursuitContact: "unknown",
      responderCount: 2
    });

    runtime.dispose();
    controller.dispose();
  });

  it("reports direct pressure once responders close in and broken contact after the player opens space", async () => {
    const { manifest, spawnCandidate } = createManifest();
    const controller = createPlayerVehicleController({ eventTarget: window });
    const runtime = await createSceneResponderRuntime({
      controller,
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      loadTuningProfile: vi.fn(async () => createTuning()),
      spawnResponderVehicle: (options) => createResponderVehicle(options.plan)
    });
    const activeVehicle = {
      mesh: {
        name: "starter-vehicle",
        position: new Vector3(0, 0, 0),
        rotation: {
          y: 0
        }
      },
      vehicleType: "sedan"
    };

    runtime.update({
      activeVehicle: activeVehicle as never,
      deltaSeconds: 1 / 60,
      heatSnapshot: createHeatSnapshot({ responderCount: 1 })
    });

    const [responder] = runtime.getVehicles();

    responder?.mesh.position.copyFromFloats(8, 0, 0);
    expect(
      runtime.update({
        activeVehicle: activeVehicle as never,
        deltaSeconds: 1 / 60,
        heatSnapshot: createHeatSnapshot({ responderCount: 1 })
      })
    ).toMatchObject({ pursuitContact: "direct" });

    responder?.mesh.position.copyFromFloats(36, 0, 0);
    expect(
      runtime.update({
        activeVehicle: activeVehicle as never,
        deltaSeconds: 1 / 60,
        heatSnapshot: createHeatSnapshot({ responderCount: 1 })
      })
    ).toMatchObject({ pursuitContact: "broken" });

    runtime.dispose();
    controller.dispose();
  });
});
