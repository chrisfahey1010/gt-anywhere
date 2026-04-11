import { describe, expect, it } from "vitest";
import { WorldHeatHud } from "../../src/ui/hud/world-heat-hud";
import type { RunOutcomeSnapshot } from "../../src/sandbox/reset/run-outcome-runtime";

function createIdleRunOutcomeSnapshot(overrides: Partial<RunOutcomeSnapshot> = {}): RunOutcomeSnapshot {
  return {
    outcome: null,
    outcomeTimeRemainingSeconds: null,
    phase: "none",
    recoveryTimeRemainingSeconds: null,
    ...overrides
  };
}

describe("world heat hud", () => {
  it("renders a lightweight staged indicator with recent escalation copy", () => {
    const host = document.createElement("div");
    const hud = new WorldHeatHud({ host });

    hud.setVisible(true);
    hud.render({
      captureTimeRemainingSeconds: null,
      escapeCooldownRemainingSeconds: 0,
      escapePhase: "breaking-contact",
      failSignal: null,
      level: 3,
      maxScore: 100,
      pursuitPhase: "active",
      recentEvents: [
        {
          dedupeKey: "combat.weapon.fired:player",
          incidentType: "combat.weapon.fired",
          levelAfter: 1,
          scoreAfter: 8,
          scoreDelta: 8,
          stageAfter: "watch",
          timestampSeconds: 1
        },
        {
          dedupeKey: "pedestrian.struck:ped-1",
          incidentType: "pedestrian.struck",
          levelAfter: 2,
          scoreAfter: 36,
          scoreDelta: 28,
          stageAfter: "elevated",
          timestampSeconds: 2
        },
        {
          dedupeKey: "prop.broken:prop-1",
          incidentType: "prop.broken",
          levelAfter: 3,
          scoreAfter: 50,
          scoreDelta: 14,
          stageAfter: "high",
          timestampSeconds: 3
        }
      ],
      responderCount: 2,
      score: 50,
      stage: "high",
      stageThresholds: [0, 8, 24, 48, 72]
    }, createIdleRunOutcomeSnapshot({ outcome: "BUSTED", phase: "showing-outcome" }));

    const root = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;
    const pips = host.querySelectorAll(".world-heat-hud__pip--active");

    expect(root.hidden).toBe(false);
    expect(root.textContent).toContain("HEAT");
    expect(root.textContent).toContain("HIGH");
    expect(root.textContent).toContain("PURSUIT ACTIVE");
    expect(root.textContent).toContain("ESCAPE BREAKING CONTACT");
    expect(root.textContent).toContain("2 RESPONDERS");
    expect(root.textContent).toContain("BUSTED");
    expect(root.textContent).toContain("PROP DAMAGE");
    expect(pips).toHaveLength(3);
  });

  it("clears and hides itself cleanly outside world-ready visibility", () => {
    const host = document.createElement("div");
    const hud = new WorldHeatHud({ host });

    hud.setVisible(true);
    hud.render({
      captureTimeRemainingSeconds: null,
      escapeCooldownRemainingSeconds: 0,
      escapePhase: "inactive",
      failSignal: null,
      level: 1,
      maxScore: 100,
      pursuitPhase: "none",
      recentEvents: [],
      responderCount: 0,
      score: 8,
      stage: "watch",
      stageThresholds: [0, 8, 24, 48, 72]
    });
    hud.clear();
    hud.setVisible(false);

    const root = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;

    expect(root.hidden).toBe(true);
    expect(root.textContent).not.toContain("WATCH");
  });
});
