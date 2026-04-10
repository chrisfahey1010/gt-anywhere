import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyCombatSceneTelemetry,
  createSceneCombatRuntime,
  updateSceneCombat
} from "../../src/rendering/scene/combat-scene-runtime";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";

describe("combat scene runtime", () => {
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

  function createVehicle(name: string, z: number, interactionRole: "active" | "hijackable" | "traffic") {
    return {
      damageState: createPristineVehicleDamageState(),
      mesh: {
        metadata: {
          interactionRole
        },
        name,
        position: new Vector3(0, 1.7, z)
      },
      physicsAggregate: {
        body: {
          getLinearVelocity: () => Vector3.Zero()
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

  function createOnFootActor() {
    return {
      eyeHeight: 1.53,
      mesh: {
        name: "on-foot-actor",
        position: new Vector3(0, 0.9, 0)
      },
      radius: 0.3
    };
  }

  it("translates scene actors into explicit pedestrian combat hits and gunfire threats", () => {
    const runtime = createSceneCombatRuntime();
    const result = updateSceneCombat({
      activeVehicle: createVehicle("starter-vehicle", -6, "active"),
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 0,
        weaponSlotRequested: 1
      },
      combatEnabled: true,
      deltaSeconds: 0.2,
      facingYaw: 0,
      hijackableVehicles: [],
      lookPitch: 0,
      onFootActor: createOnFootActor(),
      pedestrianSystem: {
        consumeEvents: () => [],
        dispose: () => {},
        getPedestrians: () => [
          {
            currentState: "standing",
            getSnapshot: () => ({ calmState: "standing", currentState: "standing", position: { x: 0, y: 0.85, z: 8 } }),
            id: "ped-hit",
            mesh: {
              metadata: { interactionRole: "pedestrian" },
              position: new Vector3(0, 0.85, 8)
            }
          },
          {
            currentState: "standing",
            getSnapshot: () => ({ calmState: "standing", currentState: "standing", position: { x: 2.8, y: 0.85, z: 12 } }),
            id: "ped-threat",
            mesh: {
              metadata: { interactionRole: "pedestrian" },
              position: new Vector3(2.8, 0.85, 12)
            }
          }
        ],
        update: () => []
      },
      runtime,
      trafficVehicles: []
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "combat.weapon.changed",
      "combat.weapon.fired",
      "combat.target.hit",
      "combat.target.threatened"
    ]);
    expect(result.pedestrianCombatHits).toEqual([
      {
        pedestrianId: "ped-hit",
        sourceId: "rifle-shot-1"
      }
    ]);
    expect(result.pedestrianCombatThreats).toEqual([
      expect.objectContaining({
        id: "rifle-shot-1",
        kind: "gunfire"
      })
    ]);
  });

  it("routes vehicle and prop targets into the existing chaos seam inputs", () => {
    const runtime = createSceneCombatRuntime();
    const vehicleResult = updateSceneCombat({
      activeVehicle: createVehicle("starter-vehicle", 10, "active"),
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 0,
        weaponSlotRequested: 1
      },
      combatEnabled: true,
      deltaSeconds: 0.2,
      facingYaw: 0,
      hijackableVehicles: [],
      lookPitch: 0,
      onFootActor: createOnFootActor(),
      pedestrianSystem: null,
      runtime,
      trafficVehicles: []
    });

    expect(vehicleResult.chaosVehicleHits).toEqual([
      expect.objectContaining({
        sourceId: "rifle-shot-1",
        targetVehicleId: "starter-vehicle"
      })
    ]);

    const propRuntime = createSceneCombatRuntime();
    const propResult = updateSceneCombat({
      activeVehicle: createVehicle("starter-vehicle", -6, "active"),
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 0,
        weaponSlotRequested: 1
      },
      combatEnabled: true,
      deltaSeconds: 0.2,
      facingYaw: 0,
      hijackableVehicles: [],
      lookPitch: 0,
      onFootActor: createOnFootActor(),
      pedestrianSystem: null,
      runtime: propRuntime,
      trafficVehicles: [],
      chaosRuntime: {
        dispose: () => {},
        getBreakableProps: () => [
          {
            breakState: "intact",
            id: "prop-1",
            mesh: {
              metadata: { interactionRole: "breakable-prop" },
              position: new Vector3(0, 1.3, 9)
            },
            position: { x: 0, y: 0, z: 9 },
            propType: "signpost"
          }
        ]
      } as never
    } as never);

    expect(propResult.chaosPropHits).toEqual([
      expect.objectContaining({
        propId: "prop-1",
        sourceId: "rifle-shot-1"
      })
    ]);
  });

  it("publishes additive combat telemetry without changing readiness or camera fields", () => {
    const runtime = createSceneCombatRuntime();
    updateSceneCombat({
      activeVehicle: createVehicle("starter-vehicle", -6, "active"),
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 0,
        weaponSlotRequested: 1
      },
      combatEnabled: true,
      deltaSeconds: 0.2,
      facingYaw: 0,
      hijackableVehicles: [],
      lookPitch: 0,
      onFootActor: createOnFootActor(),
      pedestrianSystem: {
        consumeEvents: () => [],
        dispose: () => {},
        getPedestrians: () => [
          {
            currentState: "standing",
            getSnapshot: () => ({ calmState: "standing", currentState: "standing", position: { x: 0, y: 0.85, z: 8 } }),
            id: "ped-hit",
            mesh: {
              metadata: { interactionRole: "pedestrian" },
              position: new Vector3(0, 0.85, 8)
            }
          }
        ],
        update: () => []
      },
      runtime,
      trafficVehicles: []
    });

    const canvas = document.createElement("canvas");
    canvas.dataset.readyMilestone = "controllable-vehicle";
    canvas.dataset.activeCamera = "on-foot-camera";
    scene.metadata = {
      activeCamera: "on-foot-camera",
      readinessMilestone: "controllable-vehicle"
    };

    applyCombatSceneTelemetry({ canvas, runtime, scene });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("on-foot-camera");
    expect(canvas.dataset.combatActiveWeapon).toBe("rifle");
    expect(canvas.dataset.combatHitCount).toBe("1");
    expect((scene.metadata as Record<string, unknown>).readinessMilestone).toBe("controllable-vehicle");
    expect((scene.metadata as Record<string, unknown>).combatRecentEvents).toEqual([
      "combat.weapon.changed",
      "combat.weapon.fired",
      "combat.target.hit"
    ]);
  });

  it("resets combat state when the scene runtime is recreated", () => {
    const firstRuntime = createSceneCombatRuntime();
    updateSceneCombat({
      activeVehicle: createVehicle("starter-vehicle", 10, "active"),
      combatControls: {
        firePressed: true,
        weaponCycleDirection: 0,
        weaponSlotRequested: 1
      },
      combatEnabled: true,
      deltaSeconds: 0.2,
      facingYaw: 0,
      hijackableVehicles: [],
      lookPitch: 0,
      onFootActor: createOnFootActor(),
      pedestrianSystem: null,
      runtime: firstRuntime,
      trafficVehicles: []
    });

    expect(firstRuntime.getSnapshot()).toMatchObject({
      activeWeaponId: "rifle",
      shotCount: 1
    });

    firstRuntime.dispose();

    const restartedRuntime = createSceneCombatRuntime();
    expect(restartedRuntime.getSnapshot()).toMatchObject({
      activeWeaponId: "sidearm",
      hitCount: 0,
      shotCount: 0,
      targetCount: 0
    });
  });
});
