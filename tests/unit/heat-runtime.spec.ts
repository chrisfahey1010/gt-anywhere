import { describe, expect, it } from "vitest";
import { createHeatRuntime } from "../../src/sandbox/heat/heat-runtime";

describe("heat runtime", () => {
  it("accumulates score from explicit danger incidents and exposes staged snapshots", () => {
    const runtime = createHeatRuntime();

    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "inactive",
      level: 0,
      pursuitPhase: "none",
      recentEvents: [],
      score: 0,
      stage: "calm"
    });

    const firstEvents = runtime.record({
      sourceId: "player",
      timestampSeconds: 1,
      type: "combat.weapon.fired",
      weaponId: "rifle"
    });
    const secondEvents = runtime.record({
      pedestrianId: "ped-1",
      sourceId: "player",
      timestampSeconds: 2,
      type: "pedestrian.struck"
    });
    const thirdEvents = runtime.record({
      propId: "prop-1",
      sourceId: "player-car",
      timestampSeconds: 3,
      type: "prop.broken"
    });
    const fourthEvents = runtime.record({
      severity: "heavy",
      sourceId: "player-car",
      sourceType: "vehicle",
      targetVehicleId: "traffic-car-1",
      timestampSeconds: 4,
      type: "vehicle.damaged"
    });

    expect(firstEvents.map((event) => event.type)).toEqual(["heat.incident.recorded", "heat.level.changed"]);
    expect(secondEvents.map((event) => event.type)).toEqual(["heat.incident.recorded", "heat.level.changed"]);
    expect(thirdEvents.map((event) => event.type)).toEqual(["heat.incident.recorded", "heat.level.changed"]);
    expect(fourthEvents.map((event) => event.type)).toEqual(["heat.incident.recorded", "heat.level.changed"]);

    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "inactive",
      level: 4,
      pursuitPhase: "none",
      score: 76,
      stage: "critical"
    });
    expect(runtime.getSnapshot().recentEvents).toEqual([
      expect.objectContaining({ incidentType: "combat.weapon.fired", scoreDelta: 8 }),
      expect.objectContaining({ incidentType: "pedestrian.struck", scoreDelta: 28 }),
      expect.objectContaining({ incidentType: "prop.broken", scoreDelta: 14 }),
      expect.objectContaining({ incidentType: "vehicle.damaged", scoreDelta: 26 })
    ]);
  });

  it("ignores non-scoring events for this story", () => {
    const runtime = createHeatRuntime();

    expect(
      runtime.record({
        sourceId: "player",
        timestampSeconds: 1,
        type: "combat.weapon.changed",
        weaponId: "rifle",
        weaponSlot: 1
      })
    ).toEqual([]);
    expect(
      runtime.record({
        pedestrianId: "ped-1",
        sourceId: "player",
        timestampSeconds: 2,
        type: "pedestrian.panicked"
      })
    ).toEqual([]);

    expect(runtime.getSnapshot()).toMatchObject({
      level: 0,
      recentEvents: [],
      score: 0,
      stage: "calm"
    });
  });

  it("normalizes repeated gunfire bursts and collision loops with incident windows", () => {
    const runtime = createHeatRuntime();

    expect(
      runtime.record({
        sourceId: "player",
        timestampSeconds: 1,
        type: "combat.weapon.fired",
        weaponId: "rifle"
      })
    ).toHaveLength(2);
    expect(
      runtime.record({
        sourceId: "player",
        timestampSeconds: 1.2,
        type: "combat.weapon.fired",
        weaponId: "rifle"
      })
    ).toEqual([]);
    expect(
      runtime.record({
        sourceId: "player",
        timestampSeconds: 1.8,
        type: "combat.weapon.fired",
        weaponId: "rifle"
      })
    ).toHaveLength(1);

    expect(
      runtime.record({
        severity: "moderate",
        sourceId: "player-car",
        sourceType: "vehicle",
        targetVehicleId: "traffic-car-1",
        timestampSeconds: 3,
        type: "vehicle.damaged"
      })
    ).toHaveLength(2);
    expect(
      runtime.record({
        severity: "moderate",
        sourceId: "traffic-car-1",
        sourceType: "vehicle",
        targetVehicleId: "player-car",
        timestampSeconds: 3.3,
        type: "vehicle.damaged"
      })
    ).toEqual([]);
    expect(
      runtime.record({
        severity: "moderate",
        sourceId: "traffic-car-1",
        sourceType: "vehicle",
        targetVehicleId: "player-car",
        timestampSeconds: 4,
        type: "vehicle.damaged"
      })
    ).toHaveLength(2);

    expect(runtime.getSnapshot()).toMatchObject({
      level: 3,
      score: 48,
      stage: "high"
    });
  });

  it("keeps only the four most recent scored heat events", () => {
    const runtime = createHeatRuntime();

    runtime.record({ sourceId: "player", timestampSeconds: 1, type: "combat.weapon.fired", weaponId: "rifle" });
    runtime.record({ propId: "prop-1", sourceId: "player-car", timestampSeconds: 2, type: "prop.broken" });
    runtime.record({ pedestrianId: "ped-1", sourceId: "player", timestampSeconds: 3, type: "pedestrian.struck" });
    runtime.record({
      severity: "minor",
      sourceId: "player-car",
      sourceType: "vehicle",
      targetVehicleId: "traffic-car-1",
      timestampSeconds: 4,
      type: "vehicle.damaged"
    });
    runtime.record({ propId: "prop-2", sourceId: "player-car", timestampSeconds: 5, type: "prop.broken" });

    expect(runtime.getSnapshot().recentEvents).toHaveLength(4);
    expect(runtime.getSnapshot().recentEvents.map((event) => event.incidentType)).toEqual([
      "prop.broken",
      "pedestrian.struck",
      "vehicle.damaged",
      "prop.broken"
    ]);
  });

  it("advances a first-wave pursuit through dispatch, lost contact, cooldown, and clearance", () => {
    const runtime = createHeatRuntime();

    runtime.record({
      sourceId: "player",
      timestampSeconds: 1,
      type: "combat.weapon.fired",
      weaponId: "rifle"
    });

    expect(runtime.advance({ currentTimeSeconds: 1 }).map((event) => event.type)).toContain("heat.pursuit.started");
    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "inactive",
      pursuitPhase: "dispatching",
      responderCount: 1
    });

    runtime.advance({ currentTimeSeconds: 3, pursuitContact: "direct" });

    expect(runtime.advance({ currentTimeSeconds: 6, pursuitContact: "broken" }).map((event) => event.type)).toContain(
      "heat.pursuit.contact.lost"
    );
    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "breaking-contact",
      pursuitPhase: "active"
    });

    expect(runtime.advance({ currentTimeSeconds: 10, pursuitContact: "broken" }).map((event) => event.type)).toContain(
      "heat.escape.cooldown.started"
    );
    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "cooldown",
      pursuitPhase: "active"
    });

    expect(runtime.advance({ currentTimeSeconds: 18, pursuitContact: "broken" }).map((event) => event.type)).toContain(
      "heat.pursuit.cleared"
    );
    expect(runtime.getSnapshot()).toMatchObject({
      escapePhase: "cleared",
      pursuitPhase: "none"
    });
  });

  it("emits a typed fail-condition signal after sustained direct pursuit pressure", () => {
    const runtime = createHeatRuntime();

    runtime.record({
      severity: "heavy",
      sourceId: "player-car",
      sourceType: "vehicle",
      targetVehicleId: "traffic-car-1",
      timestampSeconds: 1,
      type: "vehicle.damaged"
    });
    runtime.advance({ currentTimeSeconds: 1 });

    expect(runtime.advance({ currentTimeSeconds: 8, pursuitContact: "direct" }).map((event) => event.type)).not.toContain(
      "heat.fail.signaled"
    );
    expect(runtime.advance({ currentTimeSeconds: 14, pursuitContact: "direct" }).map((event) => event.type)).toContain(
      "heat.fail.signaled"
    );
    expect(runtime.getSnapshot()).toMatchObject({
      failSignal: "capture",
      pursuitPhase: "capturing"
    });
  });

  it("scales responder count mainly through heat level while pursuit stays active", () => {
    const runtime = createHeatRuntime();

    runtime.record({
      sourceId: "player",
      timestampSeconds: 1,
      type: "combat.weapon.fired",
      weaponId: "rifle"
    });
    runtime.advance({ currentTimeSeconds: 1 });
    expect(runtime.getSnapshot().responderCount).toBe(1);

    runtime.record({
      pedestrianId: "ped-1",
      sourceId: "player",
      timestampSeconds: 2,
      type: "pedestrian.struck"
    });
    runtime.advance({ currentTimeSeconds: 2 });
    expect(runtime.getSnapshot().responderCount).toBe(2);

    runtime.record({
      severity: "heavy",
      sourceId: "player-car",
      sourceType: "vehicle",
      targetVehicleId: "traffic-car-1",
      timestampSeconds: 3,
      type: "vehicle.damaged"
    });
    runtime.advance({ currentTimeSeconds: 3 });
    expect(runtime.getSnapshot().responderCount).toBe(3);

    runtime.record({
      propId: "prop-1",
      sourceId: "player-car",
      timestampSeconds: 4,
      type: "prop.broken"
    });
    runtime.advance({ currentTimeSeconds: 4 });
    expect(runtime.getSnapshot().responderCount).toBe(4);
  });
});
