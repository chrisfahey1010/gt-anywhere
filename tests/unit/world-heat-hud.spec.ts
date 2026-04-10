import { describe, expect, it } from "vitest";
import { WorldHeatHud } from "../../src/ui/hud/world-heat-hud";

describe("world heat hud", () => {
  it("renders a lightweight staged indicator with recent escalation copy", () => {
    const host = document.createElement("div");
    const hud = new WorldHeatHud({ host });

    hud.setVisible(true);
    hud.render({
      escapePhase: "inactive",
      level: 3,
      maxScore: 100,
      pursuitPhase: "none",
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
      score: 50,
      stage: "high",
      stageThresholds: [0, 8, 24, 48, 72]
    });

    const root = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;
    const pips = host.querySelectorAll(".world-heat-hud__pip--active");

    expect(root.hidden).toBe(false);
    expect(root.textContent).toContain("HEAT");
    expect(root.textContent).toContain("HIGH");
    expect(root.textContent).toContain("PROP DAMAGE");
    expect(pips).toHaveLength(3);
  });

  it("clears and hides itself cleanly outside world-ready visibility", () => {
    const host = document.createElement("div");
    const hud = new WorldHeatHud({ host });

    hud.setVisible(true);
    hud.render({
      escapePhase: "inactive",
      level: 1,
      maxScore: 100,
      pursuitPhase: "none",
      recentEvents: [],
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
