import { describe, expect, it } from "vitest";
import {
  applyHeatSceneTelemetry,
  createSceneHeatRuntime,
  updateSceneHeat
} from "../../src/rendering/scene/heat-scene-runtime";

describe("heat scene runtime", () => {
  it("translates explicit combat, pedestrian, and chaos outputs into heat incidents", () => {
    const runtime = createSceneHeatRuntime();

    const events = updateSceneHeat({
      chaosEvents: [
        {
          impactSpeed: 10,
          propId: "prop-1",
          propType: "signpost",
          sourceId: "player-car",
          type: "prop.broken"
        },
        {
          damageDelta: 16,
          damageState: {
            accumulatedDamage: 16,
            normalizedSeverity: 0.16,
            severity: "moderate"
          },
          impactSpeed: 23,
          sourceId: "player-car",
          sourceType: "vehicle",
          targetVehicleId: "traffic-car-1",
          type: "vehicle.damaged"
        }
      ],
      combatEvents: [
        {
          timestampSeconds: 1,
          type: "combat.weapon.changed",
          weaponId: "rifle",
          weaponSlot: 1
        },
        {
          impactSpeed: 11.5,
          shotCount: 1,
          timestampSeconds: 1,
          type: "combat.weapon.fired",
          weaponId: "rifle"
        },
        {
          distance: 9,
          impactSpeed: 11.5,
          shotCount: 1,
          targetId: "ped-1",
          targetKind: "pedestrian",
          timestampSeconds: 1,
          type: "combat.target.hit",
          weaponId: "rifle"
        }
      ],
      pedestrianEvents: [
        {
          pedestrianId: "ped-1",
          sourceId: "player",
          state: "panic",
          type: "pedestrian.panicked"
        },
        {
          pedestrianId: "ped-1",
          sourceId: "player",
          state: "struck",
          type: "pedestrian.struck"
        }
      ],
      runtime
    });

    expect(events.map((event) => event.type)).toEqual([
      "heat.incident.recorded",
      "heat.level.changed",
      "heat.incident.recorded",
      "heat.level.changed",
      "heat.incident.recorded",
      "heat.level.changed",
      "heat.incident.recorded"
    ]);
    expect(runtime.getSnapshot()).toMatchObject({
      level: 3,
      score: 66,
      stage: "high"
    });
    expect(runtime.getSnapshot().recentEvents.map((event) => event.incidentType)).toEqual([
      "combat.weapon.fired",
      "pedestrian.struck",
      "prop.broken",
      "vehicle.damaged"
    ]);
  });

  it("ignores weapon changes, passive panic, and combat target hits when scoring heat", () => {
    const runtime = createSceneHeatRuntime();

    expect(
      updateSceneHeat({
        chaosEvents: [],
        combatEvents: [
          {
            timestampSeconds: 1,
            type: "combat.weapon.changed",
            weaponId: "rifle",
            weaponSlot: 1
          },
          {
            distance: 9,
            impactSpeed: 11.5,
            shotCount: 1,
            targetId: "ped-1",
            targetKind: "pedestrian",
            timestampSeconds: 1,
            type: "combat.target.hit",
            weaponId: "rifle"
          }
        ],
        pedestrianEvents: [
          {
            pedestrianId: "ped-1",
            sourceId: "starter-vehicle",
            state: "panic",
            type: "pedestrian.panicked"
          }
        ],
        runtime
      })
    ).toEqual([]);

    expect(runtime.getSnapshot()).toMatchObject({
      level: 0,
      recentEvents: [],
      score: 0,
      stage: "calm"
    });
  });

  it("reuses vehicle damage severity and source metadata while normalizing reciprocal crash events", () => {
    const runtime = createSceneHeatRuntime();

    const events = updateSceneHeat({
      chaosEvents: [
        {
          damageDelta: 16,
          damageState: {
            accumulatedDamage: 16,
            normalizedSeverity: 0.16,
            severity: "moderate"
          },
          impactSpeed: 21,
          sourceId: "player-car",
          sourceType: "vehicle",
          targetVehicleId: "traffic-car-1",
          type: "vehicle.damaged"
        },
        {
          damageDelta: 16,
          damageState: {
            accumulatedDamage: 16,
            normalizedSeverity: 0.16,
            severity: "moderate"
          },
          impactSpeed: 21,
          sourceId: "traffic-car-1",
          sourceType: "vehicle",
          targetVehicleId: "player-car",
          type: "vehicle.damaged"
        }
      ],
      combatEvents: [],
      pedestrianEvents: [],
      runtime
    });

    expect(events.map((event) => event.type)).toEqual(["heat.incident.recorded", "heat.level.changed"]);
    expect(runtime.getSnapshot()).toMatchObject({
      level: 1,
      score: 16,
      stage: "watch"
    });
    expect(runtime.getSnapshot().recentEvents).toEqual([
      expect.objectContaining({
        dedupeKey: "vehicle.damaged:vehicle:player-car:traffic-car-1",
        incidentType: "vehicle.damaged",
        scoreDelta: 16
      })
    ]);
  });

  it("publishes additive heat telemetry without changing readiness or camera fields", () => {
    const runtime = createSceneHeatRuntime();
    const events = updateSceneHeat({
      combatEvents: [
        {
          impactSpeed: 11.5,
          shotCount: 1,
          timestampSeconds: 1,
          type: "combat.weapon.fired",
          weaponId: "rifle"
        }
      ],
      runtime
    });
    const canvas = document.createElement("canvas");
    const scene = {
      metadata: {
        activeCamera: "starter-vehicle-camera",
        readinessMilestone: "controllable-vehicle"
      }
    };

    canvas.dataset.activeCamera = "starter-vehicle-camera";
    canvas.dataset.readyMilestone = "controllable-vehicle";

    applyHeatSceneTelemetry({ canvas, events, runtime, scene });

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(canvas.dataset.heatLevel).toBe("1");
    expect(canvas.dataset.heatStage).toBe("watch");
    expect(canvas.dataset.heatScore).toBe("8");
    expect(canvas.dataset.heatRecentEvents).toBe("combat.weapon.fired");
    expect(canvas.dataset.heatStageChanged).toBe("true");
    expect(scene.metadata).toMatchObject({
      activeCamera: "starter-vehicle-camera",
      heatLevel: 1,
      heatRecentEvents: ["combat.weapon.fired"],
      heatScore: 8,
      heatStage: "watch",
      heatStageChanged: true,
      readinessMilestone: "controllable-vehicle"
    });
  });
});
