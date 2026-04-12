import { describe, expect, it } from "vitest";
import { WorldNavigationHud, projectWorldNavigationPoint } from "../../src/ui/hud/world-navigation-hud";

describe("world navigation hud minimap projection", () => {
  const bounds = {
    minX: -400,
    maxX: 400,
    minZ: -320,
    maxZ: 320
  };

  it("projects slice corners into the padded minimap frame", () => {
    expect(projectWorldNavigationPoint(bounds, { x: -400, z: -320 })).toEqual({ x: 8, y: 92 });
    expect(projectWorldNavigationPoint(bounds, { x: 400, z: 320 })).toEqual({ x: 92, y: 8 });
  });

  it("clamps out-of-bounds positions back into the minimap frame", () => {
    expect(projectWorldNavigationPoint(bounds, { x: 1200, z: -900 })).toEqual({ x: 92, y: 92 });
    expect(projectWorldNavigationPoint(bounds, { x: -1200, z: 900 })).toEqual({ x: 8, y: 8 });
  });

  it("renders zero yaw as upward on the minimap", () => {
    const host = document.createElement("div");
    const hud = new WorldNavigationHud({ host });

    hud.setVisible(true);
    hud.render({
      actor: {
        position: { x: 0, y: 0, z: 0 },
        facingYaw: 0,
        possessionMode: "vehicle"
      },
      bounds,
      districtName: "Downtown",
      locationName: "San Francisco, CA",
      roads: [],
      streetLabel: "Market Street"
    });

    const heading = host.querySelector("line") as SVGLineElement;
    const y1 = Number(heading.getAttribute("y1"));
    const y2 = Number(heading.getAttribute("y2"));

    expect(y2).toBeLessThan(y1);
  });

  it("publishes possession mode as additive HUD state for on-foot styling", () => {
    const host = document.createElement("div");
    const hud = new WorldNavigationHud({ host });

    hud.setVisible(true);
    hud.render({
      actor: {
        position: { x: 0, y: 0, z: 0 },
        facingYaw: 0,
        possessionMode: "on-foot"
      },
      bounds,
      districtName: "Downtown",
      locationName: "San Francisco, CA",
      roads: [],
      streetLabel: "Market Street"
    });

    const root = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;

    expect(root.dataset.possessionMode).toBe("on-foot");
  });
});
