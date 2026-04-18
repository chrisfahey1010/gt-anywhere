import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrafficSystem } from "../../src/traffic/runtime/traffic-system";
import type { VehicleControlState } from "../../src/vehicles/controllers/player-vehicle-controller";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import type { SliceManifest, SpawnCandidate, TrafficVehiclePlan } from "../../src/world/chunks/slice-manifest";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

describe("traffic system", () => {
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

  function createManifest(trafficVehicles: TrafficVehiclePlan[]): { manifest: SliceManifest; spawnCandidate: SpawnCandidate } {
    const spawnCandidate: SpawnCandidate = {
      chunkId: "chunk-0-0",
      headingDegrees: 0,
      id: "spawn-0",
      laneIndex: 0,
      position: { x: 0, y: 0, z: -10 },
      roadId: "market-st",
      starterVehicle: {
        dimensions: {
          height: 1.6,
          length: 4.6,
          width: 2.2
        },
        kind: "starter-car",
        placement: "lane-center"
      },
      surface: "road"
    };

    return {
      manifest: {
        bounds: {
          minX: -60,
          maxX: 60,
          minZ: -60,
          maxZ: 60
        },
        chunks: [
          {
            id: "chunk-0-0",
            origin: { x: -60, y: 0, z: -60 },
            roadIds: ["market-st"],
            size: { width: 120, depth: 120 }
          }
        ],
        generationVersion: "test",
        location: {
          placeName: "Test City",
          reuseKey: "test-city",
          sessionKey: "test-city-session"
        },
        roads: [
          {
            id: "market-st",
            kind: "primary",
            points: [
              { x: 0, y: 0, z: -40 },
              { x: 0, y: 0, z: 40 }
            ],
            width: 18
          }
        ],
        districts: [],
        worldEntries: [],
        sceneMetadata: {
          boundaryColor: "#000000",
          displayName: "Test City",
          districtName: "Downtown",
          groundColor: "#111111",
          roadColor: "#222222"
        },
        seed: "seed",
        sliceId: "slice",
        spawnCandidates: [spawnCandidate],
        traffic: {
          vehicles: trafficVehicles
        }
      },
      spawnCandidate
    };
  }

  function createTuning(): VehicleTuning {
    return {
      color: "#f25f5c",
      dimensions: {
        height: 1.6,
        length: 4.5,
        width: 1.8
      },
      mass: 1200,
      maxForwardSpeed: 16,
      maxReverseSpeed: 7,
      maxTurnRate: 1.8,
      damage: {
        durability: 100,
        impactSpeedThreshold: 7
      },
      model: {
        bodyStyle: "sedan"
      },
      name: "Sedan"
    };
  }

  it("creates runtime vehicles from the manifest traffic plan and disposes them cleanly", async () => {
    const updateCalls: unknown[] = [];
    const disposeCalls: string[] = [];
    const { manifest, spawnCandidate } = createManifest([
      {
        chunkId: "chunk-0-0",
        direction: "forward",
        headingDegrees: 0,
        id: "market-st-traffic-0-0",
        position: { x: 0, y: 0, z: -20 },
        roadId: "market-st",
        speedScale: 0.5,
        startDistance: 20,
        vehicleType: "sedan"
      }
    ]);

    const system = await createTrafficSystem({
      controller: {
        bindVehicle: () => {},
        captureInputFrame: () => {
          throw new Error("not used in traffic system test");
        },
        consumeSwitchVehicleRequest: () => false,
        dispose: () => {},
        getState: () => {
          throw new Error("traffic vehicles must not read player controller state");
        },
        unbindVehicle: () => {}
      },
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      spawnTrafficVehicle: vi.fn(({ plan, tuning }) => ({
        damageState: createPristineVehicleDamageState(),
        dispose: () => {
          disposeCalls.push(plan.id);
        },
        id: plan.id,
        mesh: {
          getDirection: () => new Vector3(0, 0, 1),
          name: `traffic-vehicle-${plan.id}`,
          position: new Vector3(plan.position.x, 1.7, plan.position.z),
          rotation: { y: 0 }
        },
        physicsAggregate: {
          body: {
            getLinearVelocity: () => Vector3.Zero()
          }
        },
        tuning,
        vehicleType: plan.vehicleType,
        update: (controls: VehicleControlState) => {
          updateCalls.push(controls);
        }
      })),
      loadTuningProfile: vi.fn(async () => createTuning())
    });

    expect(system.getVehicles()).toHaveLength(1);

    system.update(1 / 60);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).not.toBeUndefined();

    system.dispose();
    expect(disposeCalls).toEqual(["market-st-traffic-0-0"]);
  });

  it("slows the trailing vehicle when another obstacle sits directly ahead", async () => {
    const updateCalls: Array<{ brake: number; throttle: number }> = [];
    const { manifest, spawnCandidate } = createManifest([
      {
        chunkId: "chunk-0-0",
        direction: "forward",
        headingDegrees: 0,
        id: "market-st-traffic-0-0",
        position: { x: 0, y: 0, z: -8 },
        roadId: "market-st",
        speedScale: 0.5,
        startDistance: 32,
        vehicleType: "sedan"
      }
    ]);

    const system = await createTrafficSystem({
      controller: {
        bindVehicle: () => {},
        captureInputFrame: () => {
          throw new Error("not used in traffic system test");
        },
        consumeSwitchVehicleRequest: () => false,
        dispose: () => {},
        getState: () => {
          throw new Error("traffic vehicles must not read player controller state");
        },
        unbindVehicle: () => {}
      },
      getObstacleVehicles: () => [
        {
          mesh: {
            getDirection: () => new Vector3(0, 0, 1),
            name: "blocking-car",
            position: new Vector3(0, 1.7, -5),
            rotation: { y: 0 }
          }
        }
      ],
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      spawnTrafficVehicle: vi.fn(({ plan, tuning }) => ({
        damageState: createPristineVehicleDamageState(),
        dispose: () => {},
        id: plan.id,
        mesh: {
          getDirection: () => new Vector3(0, 0, 1),
          name: `traffic-vehicle-${plan.id}`,
          position: new Vector3(plan.position.x, 1.7, plan.position.z),
          rotation: { y: 0 }
        },
        physicsAggregate: {
          body: {
            getLinearVelocity: () => new Vector3(0, 0, 7)
          }
        },
        tuning,
        vehicleType: plan.vehicleType,
        update: (controls: VehicleControlState) => {
          updateCalls.push({ brake: controls.brake, throttle: controls.throttle });
        }
      })),
      loadTuningProfile: vi.fn(async () => createTuning())
    });

    system.update(1 / 60);

    expect(updateCalls[0]?.brake).toBeGreaterThan(updateCalls[0]?.throttle ?? 0);
  });

  it("returns a stable traffic vehicle list so the scene can observe traffic without per-frame remapping", async () => {
    const { manifest, spawnCandidate } = createManifest([
      {
        chunkId: "chunk-0-0",
        direction: "forward",
        headingDegrees: 0,
        id: "market-st-traffic-0-0",
        position: { x: 0, y: 0, z: -20 },
        roadId: "market-st",
        speedScale: 0.5,
        startDistance: 20,
        vehicleType: "sedan"
      }
    ]);

    const system = await createTrafficSystem({
      controller: {
        bindVehicle: () => {},
        captureInputFrame: () => {
          throw new Error("not used in traffic system test");
        },
        consumeSwitchVehicleRequest: () => false,
        dispose: () => {},
        getState: () => {
          throw new Error("traffic vehicles must not read player controller state");
        },
        unbindVehicle: () => {}
      },
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      spawnTrafficVehicle: vi.fn(({ plan, tuning }) => ({
        damageState: createPristineVehicleDamageState(),
        dispose: () => {},
        id: plan.id,
        mesh: {
          getDirection: () => new Vector3(0, 0, 1),
          name: `traffic-vehicle-${plan.id}`,
          position: new Vector3(plan.position.x, 1.7, plan.position.z),
          rotation: { y: 0 }
        },
        physicsAggregate: {
          body: {
            getLinearVelocity: () => Vector3.Zero()
          }
        },
        tuning,
        vehicleType: plan.vehicleType,
        update: () => {}
      })),
      loadTuningProfile: vi.fn(async () => createTuning())
    });

    const firstRead = system.getVehicles();
    const secondRead = system.getVehicles();

    expect(secondRead).toBe(firstRead);
    expect(secondRead[0]).toBe(firstRead[0]);
  });

  it("loads each unique tuning profile once even when multiple traffic plans share the same vehicle type", async () => {
    const { manifest, spawnCandidate } = createManifest([
      {
        chunkId: "chunk-0-0",
        direction: "forward",
        headingDegrees: 0,
        id: "market-st-traffic-0-0",
        position: { x: 0, y: 0, z: -20 },
        roadId: "market-st",
        speedScale: 0.5,
        startDistance: 20,
        vehicleType: "sedan"
      },
      {
        chunkId: "chunk-0-0",
        direction: "forward",
        headingDegrees: 0,
        id: "market-st-traffic-0-1",
        position: { x: 0, y: 0, z: 20 },
        roadId: "market-st",
        speedScale: 0.6,
        startDistance: 40,
        vehicleType: "sedan"
      }
    ]);
    const loadTuningProfile = vi.fn(async () => createTuning());

    const system = await createTrafficSystem({
      controller: {
        bindVehicle: () => {},
        captureInputFrame: () => {
          throw new Error("not used in traffic system test");
        },
        consumeSwitchVehicleRequest: () => false,
        dispose: () => {},
        getState: () => {
          throw new Error("traffic vehicles must not read player controller state");
        },
        unbindVehicle: () => {}
      },
      manifest,
      parent: root,
      scene,
      spawnCandidate,
      spawnTrafficVehicle: vi.fn(({ plan, tuning }) => ({
        damageState: createPristineVehicleDamageState(),
        dispose: () => {},
        id: plan.id,
        mesh: {
          getDirection: () => new Vector3(0, 0, 1),
          name: `traffic-vehicle-${plan.id}`,
          position: new Vector3(plan.position.x, 1.7, plan.position.z),
          rotation: { y: 0 }
        },
        physicsAggregate: {
          body: {
            getLinearVelocity: () => Vector3.Zero()
          }
        },
        tuning,
        vehicleType: plan.vehicleType,
        update: () => {}
      })),
      loadTuningProfile
    });

    expect(system.getVehicles()).toHaveLength(2);
    expect(loadTuningProfile).toHaveBeenCalledTimes(1);

    system.dispose();
  });
});
