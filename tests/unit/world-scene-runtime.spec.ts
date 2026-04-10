import { Scene, TargetCamera, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canSwitchControlledVehicle,
  createWorldNavigationSnapshot,
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
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 1,
        weaponSlotRequested: 1
      },
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
    } satisfies Parameters<typeof sanitizeWorldRuntimeInputFrame>[0];

    expect(canSwitchControlledVehicle({ possessionMode: "vehicle", vehicleSwitchInFlight: false })).toBe(true);
    expect(canSwitchControlledVehicle({ possessionMode: "on-foot", vehicleSwitchInFlight: false })).toBe(false);

    expect(
      sanitizeWorldRuntimeInputFrame(frame, {
        possessionMode: "vehicle",
        vehicleSwitchInFlight: false
      })
    ).toEqual({
      ...frame,
      combatControls: {
        firePressed: false,
        weaponCycleDirection: 0,
        weaponSlotRequested: null
      }
    });

    expect(
      sanitizeWorldRuntimeInputFrame(frame, {
        possessionMode: "vehicle",
        vehicleSwitchInFlight: true
      })
    ).toEqual({
      ...frame,
      combatControls: {
        firePressed: false,
        weaponCycleDirection: 0,
        weaponSlotRequested: null
      },
      interactionRequested: false
    });

    expect(
      sanitizeWorldRuntimeInputFrame(frame, {
        possessionMode: "on-foot",
        vehicleSwitchInFlight: false
      })
    ).toEqual(frame);
  });

  it("publishes a typed navigation snapshot from the active vehicle while in vehicle mode", () => {
    const result = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: "vehicle-runtime",
          position: new Vector3(24, 1.7, 6),
          rotation: new Vector3(0, Math.PI / 2, 0)
        },
        vehicleType: "sedan"
      },
      manifest: {
        bounds: {
          minX: -120,
          maxX: 120,
          minZ: -90,
          maxZ: 90
        },
        roads: [
          {
            id: "market-st",
            displayName: "Market Street",
            kind: "primary",
            width: 18,
            points: [
              { x: -100, y: 0, z: 0 },
              { x: 100, y: 0, z: 0 }
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

    expect(result.currentRoadId).toBe("market-st");
    expect(result.snapshot.actor.position).toEqual({ x: 24, y: 1.7, z: 6 });
    expect(result.snapshot.actor.facingYaw).toBeCloseTo(Math.PI / 2, 5);
    expect(result.snapshot.streetLabel).toBe("Market Street");
    expect(result.snapshot.districtName).toBe("Downtown");
    expect(result.snapshot.locationName).toBe("San Francisco, CA");
    expect(result.snapshot.bounds).toEqual({
      minX: -120,
      maxX: 120,
      minZ: -90,
      maxZ: 90
    });
    expect(result.snapshot.roads).toEqual([
      {
        id: "market-st",
        displayName: "Market Street",
        kind: "primary",
        width: 18,
        points: [
          { x: -100, z: 0 },
          { x: 100, z: 0 }
        ]
      }
    ]);
  });

  it("uses the vehicle mesh forward direction when available instead of a stale Euler yaw", () => {
    const result = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: "vehicle-runtime",
          position: new Vector3(0, 1.7, 0),
          rotation: new Vector3(0, 0, 0),
          getDirection: () => new Vector3(1, 0, 0)
        } as never,
        vehicleType: "sedan"
      },
      manifest: {
        bounds: {
          minX: -120,
          maxX: 120,
          minZ: -90,
          maxZ: 90
        },
        roads: [],
        sceneMetadata: {
          displayName: "San Francisco, CA",
          districtName: "Downtown"
        }
      },
      possessionMode: "vehicle"
    });

    expect(result.snapshot.actor.facingYaw).toBeCloseTo(Math.PI / 2, 5);
  });

  it("switches the typed navigation snapshot to the on-foot actor and facing when possession changes", () => {
    const result = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: "vehicle-runtime",
          position: new Vector3(40, 1.7, 40),
          rotation: new Vector3(0, 0, 0)
        },
        vehicleType: "sedan"
      },
      manifest: {
        bounds: {
          minX: -120,
          maxX: 120,
          minZ: -90,
          maxZ: 90
        },
        roads: [
          {
            id: "van-ness-ave",
            displayName: "Van Ness Avenue",
            kind: "secondary",
            width: 14,
            points: [
              { x: 0, y: 0, z: -80 },
              { x: 0, y: 0, z: 80 }
            ]
          }
        ],
        sceneMetadata: {
          displayName: "San Francisco, CA",
          districtName: "Downtown"
        }
      },
      onFootActor: {
        mesh: {
          name: "on-foot-actor",
          position: new Vector3(3, 0.9, 14)
        }
      },
      onFootFacingYaw: Math.PI / 4,
      possessionMode: "on-foot"
    });

    expect(result.currentRoadId).toBe("van-ness-ave");
    expect(result.snapshot.actor.position).toEqual({ x: 3, y: 0.9, z: 14 });
    expect(result.snapshot.actor.facingYaw).toBeCloseTo(Math.PI / 4, 5);
    expect(result.snapshot.actor.possessionMode).toBe("on-foot");
    expect(result.snapshot.streetLabel).toBe("Van Ness Avenue");
  });

  it("resets sticky road selection when control transfers to a different actor", () => {
    const result = createWorldNavigationSnapshot({
      activeVehicle: {
        mesh: {
          name: "hijacked-vehicle",
          position: new Vector3(1, 1.7, 2),
          rotation: new Vector3(0, 0, 0)
        },
        vehicleType: "sports-car"
      },
      manifest: {
        bounds: {
          minX: -120,
          maxX: 120,
          minZ: -90,
          maxZ: 90
        },
        roads: [
          {
            id: "market-st",
            displayName: "Market Street",
            kind: "primary",
            width: 18,
            points: [
              { x: -100, y: 0, z: 0 },
              { x: 100, y: 0, z: 0 }
            ]
          },
          {
            id: "van-ness-ave",
            displayName: "Van Ness Avenue",
            kind: "secondary",
            width: 14,
            points: [
              { x: 0, y: 0, z: -80 },
              { x: 0, y: 0, z: 80 }
            ]
          }
        ],
        sceneMetadata: {
          displayName: "San Francisco, CA",
          districtName: "Downtown"
        }
      },
      possessionMode: "vehicle",
      previousActorId: "starter-vehicle",
      previousRoadId: "market-st"
    });

    expect(result.currentRoadId).toBe("van-ness-ave");
    expect(result.snapshot.streetLabel).toBe("Van Ness Avenue");
  });
});
