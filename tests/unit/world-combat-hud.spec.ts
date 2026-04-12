import { describe, expect, it } from "vitest";
import { WorldCombatHud } from "../../src/ui/hud/world-combat-hud";

describe("world combat hud", () => {
  it("reacts to chaos-driven impact cues and clears transient state cleanly", async () => {
    const host = document.createElement("div");
    const hud = new WorldCombatHud({ host });

    hud.setVisible(true);
    hud.processImpactEventTypes(["vehicle.damaged"]);

    const root = host.querySelector('[data-testid="world-combat-hud"]') as HTMLElement;

    expect(root.hidden).toBe(false);
    expect(root.style.pointerEvents).toBe("none");
    expect(root.classList.contains("world-combat-hud--impact")).toBe(true);

    hud.clear();

    expect(root.classList.contains("world-combat-hud--impact")).toBe(false);
  });
});
