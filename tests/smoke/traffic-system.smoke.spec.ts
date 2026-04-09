import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorldNavigationSnapshot, syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";
import { createTrafficSystem } from "../../src/traffic/runtime/traffic-system";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { VehicleControlState } from "../../src/vehicles/controllers/player-vehicle-controller";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

describe("traffic system smoke", () => {
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

  function createManifest(): { manifest: SliceManifest; spawnCandidate: SpawnCandidate } {
    const spawnCandidate: SpawnCandidate = {
      chunkId: "chunk-0-0",
      headingDegrees: 0,
      id: "spawn-0",
      laneIndex: 0,
      position: { x: 0, y: 0, z: -24 },
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
          minX: -80,
          maxX: 80,
          minZ: -80,
          maxZ: 80
        },
        chunks: [
          {
            id: "chunk-0-0",
            origin: { x: -80, y: 0, z: -80 },
            roadIds: ["market-st"],
            size: { width: 160, depth: 160 }
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
            displayName: "Market Street",
            kind: "primary",
            points: [
              { x: 0, y: 0, z: -60 },
              { x: 0, y: 0, z: 60 }
            ],
            width: 18
          }
        ],
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
          vehicles: [
            {
              chunkId: "chunk-0-0",
              direction: "forward",
              headingDegrees: 0,
              id: "market-st-traffic-0-0",
              position: { x: 0, y: 0, z: -12 },
              roadId: "market-st",
              speedScale: 0.5,
              startDistance: 48,
              vehicleType: "sedan"
            }
          ]
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

  it("updates traffic, recreates it cleanly after restart-style disposal, and keeps navigation telemetry intact", async () => {
    const { manifest, spawnCandidate } = createManifest();
    const createSession = async () => {
      const trafficSystem = await createTrafficSystem({
        controller: {
          bindVehicle: () => {},
          captureInputFrame: () => {
            throw new Error("not used in traffic smoke test");
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
        spawnTrafficVehicle: vi.fn(({ plan, tuning }) => {
          let speed = 0;
          const position = new Vector3(plan.position.x, 1.7, plan.position.z);

          return {
            damageState: createPristineVehicleDamageState(),
            dispose: () => {},
            id: plan.id,
            mesh: {
              getDirection: () => new Vector3(0, 0, 1),
              name: `traffic-vehicle-${plan.id}`,
              position,
              rotation: { y: 0 }
            },
            physicsAggregate: {
              body: {
                getLinearVelocity: () => new Vector3(0, 0, speed)
              }
            },
            tuning,
            vehicleType: plan.vehicleType,
            update: (controls: VehicleControlState) => {
              speed = Math.max(0, speed + controls.throttle * 1.4 - controls.brake * 2.4);
              position.z += speed * 0.12;
            }
          };
        }),
        loadTuningProfile: vi.fn(async () => createTuning())
      });

      return trafficSystem;
    };

    const firstSession = await createSession();
    const firstVehicle = firstSession.getVehicles()[0];

    if (!firstVehicle) {
      throw new Error("Expected traffic vehicle to be created");
    }

    const initialTrafficZ = firstVehicle.mesh.position.z;

    for (let index = 0; index < 12; index += 1) {
      firstSession.update(1 / 30);
    }

    expect(firstVehicle.mesh.position.z).toBeGreaterThan(initialTrafficZ);

    const activeVehicle = {
      mesh: {
        name: "starter-vehicle-spawn-0",
        position: new Vector3(0, 1.7, -24),
        rotation: { y: 0 }
      },
      vehicleType: "sedan"
    };
    const canvas = document.createElement("canvas");

    scene.metadata = {
      trafficVehicleCount: firstSession.getVehicles().length,
      trafficVehicleIds: firstSession.getVehicles().map((vehicle) => vehicle.mesh.name)
    };
    syncWorldSceneTelemetry({
      activeVehicle,
      canvas,
      fallbackCameraName: "starter-vehicle-camera",
      possessionMode: "vehicle",
      scene,
      spawnPoint: activeVehicle.mesh.position.clone()
    });

    expect(canvas.dataset.starterVehicleId).toBe("starter-vehicle-spawn-0");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect((scene.metadata as Record<string, unknown>).trafficVehicleCount).toBe(1);
    expect(
      createWorldNavigationSnapshot({
        activeVehicle,
        manifest,
        possessionMode: "vehicle"
      }).snapshot
    ).toMatchObject({
      actor: {
        possessionMode: "vehicle"
      },
      streetLabel: "Market Street"
    });

    firstSession.dispose();

    const restartedSession = await createSession();
    const restartedVehicle = restartedSession.getVehicles()[0];

    if (!restartedVehicle) {
      throw new Error("Expected restarted traffic vehicle to be created");
    }

    expect(restartedVehicle.id).toBe("market-st-traffic-0-0");
    expect(restartedVehicle.mesh.position.z).toBeCloseTo(initialTrafficZ, 5);

    restartedSession.dispose();
  });
});
