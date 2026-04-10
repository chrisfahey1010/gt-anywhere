import { describe, expect, it } from "vitest";
import { createCombatRuntime } from "../../src/sandbox/combat/combat-runtime";

function createAim(overrides: Partial<{
  facingYaw: number;
  lookPitch: number;
  origin: { x: number; y: number; z: number };
}> = {}) {
  return {
    facingYaw: 0,
    lookPitch: 0,
    origin: {
      x: 0,
      y: 1.4,
      z: 0
    },
    ...overrides
  };
}

function createInput(overrides: Partial<{
  firePressed: boolean;
  weaponCycleDirection: -1 | 0 | 1;
  weaponSlotRequested: 0 | 1 | null;
}> = {}) {
  return {
    firePressed: false,
    weaponCycleDirection: 0 as const,
    weaponSlotRequested: null,
    ...overrides
  };
}

describe("combat runtime", () => {
  it("starts with the sidearm selected and changes weapons by slot or cycle", () => {
    const runtime = createCombatRuntime();

    expect(runtime.getSnapshot()).toMatchObject({
      activeWeaponId: "sidearm",
      activeWeaponSlot: 0,
      hitCount: 0,
      shotCount: 0
    });

    expect(
      runtime.update({
        aim: createAim(),
        currentTimeSeconds: 0,
        input: createInput({ weaponSlotRequested: 1 }),
        targets: []
      })
    ).toEqual([
      expect.objectContaining({
        type: "combat.weapon.changed",
        weaponId: "rifle",
        weaponSlot: 1
      })
    ]);

    expect(runtime.getSnapshot().activeWeaponId).toBe("rifle");

    expect(
      runtime.update({
        aim: createAim(),
        currentTimeSeconds: 0.1,
        input: createInput({ weaponCycleDirection: 1 }),
        targets: []
      })
    ).toEqual([
      expect.objectContaining({
        type: "combat.weapon.changed",
        weaponId: "sidearm",
        weaponSlot: 0
      })
    ]);
  });

  it("fires with readable cadence and emits typed hit events from direct target resolution", () => {
    const runtime = createCombatRuntime();
    const targets = [
      {
        id: "ped-1",
        kind: "pedestrian" as const,
        position: { x: 0, y: 1.4, z: 10 },
        radius: 0.8
      }
    ];

    const firstShot = runtime.update({
      aim: createAim(),
      currentTimeSeconds: 0,
      input: createInput({ firePressed: true }),
      targets
    });

    expect(firstShot.map((event) => event.type)).toEqual(["combat.weapon.fired", "combat.target.hit"]);
    expect(firstShot[1]).toEqual(
      expect.objectContaining({
        impactSpeed: expect.any(Number),
        targetId: "ped-1",
        targetKind: "pedestrian",
        weaponId: "sidearm"
      })
    );

    expect(
      runtime.update({
        aim: createAim(),
        currentTimeSeconds: 0.1,
        input: createInput({ firePressed: true }),
        targets
      })
    ).toEqual([]);

    expect(
      runtime.update({
        aim: createAim(),
        currentTimeSeconds: 0.36,
        input: createInput({ firePressed: true }),
        targets
      }).map((event) => event.type)
    ).toEqual(["combat.weapon.fired", "combat.target.hit"]);

    expect(runtime.getSnapshot()).toMatchObject({
      hitCount: 2,
      shotCount: 2
    });
  });

  it("emits nearby threat events without a direct hit and keeps recent events bounded", () => {
    const runtime = createCombatRuntime();
    const targets = [
      {
        id: "ped-near-miss",
        kind: "pedestrian" as const,
        position: { x: 2.8, y: 1.4, z: 12 },
        radius: 0.5
      }
    ];

    const firstBurst = runtime.update({
      aim: createAim(),
      currentTimeSeconds: 0,
      input: createInput({ weaponSlotRequested: 1 }),
      targets
    });

    expect(firstBurst).toEqual([
      expect.objectContaining({
        type: "combat.weapon.changed",
        weaponId: "rifle"
      })
    ]);

    const threatEvents = runtime.update({
      aim: createAim(),
      currentTimeSeconds: 0.2,
      input: createInput({ firePressed: true }),
      targets
    });

    expect(threatEvents.map((event) => event.type)).toEqual(["combat.weapon.fired", "combat.target.threatened"]);
    expect(threatEvents[1]).toEqual(
      expect.objectContaining({
        targetId: "ped-near-miss",
        targetKind: "pedestrian",
        weaponId: "rifle"
      })
    );

    runtime.update({
      aim: createAim(),
      currentTimeSeconds: 0.4,
      input: createInput({ firePressed: true }),
      targets
    });
    runtime.update({
      aim: createAim(),
      currentTimeSeconds: 0.6,
      input: createInput({ firePressed: true }),
      targets
    });

    expect(runtime.getSnapshot().recentEvents).toHaveLength(4);
    expect(runtime.getSnapshot().recentTargetIds).toContain("ped-near-miss");
  });
});
