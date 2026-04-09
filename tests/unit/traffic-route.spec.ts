import { describe, expect, it } from "vitest";
import { createTrafficRoute, sampleTrafficRoutePoint } from "../../src/traffic/routing/traffic-route";

describe("traffic route sampling", () => {
  it("samples deterministic positions across multi-segment road geometry", () => {
    const route = createTrafficRoute({
      id: "market-st",
      kind: "primary",
      width: 18,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 20 },
        { x: 20, y: 0, z: 20 }
      ]
    });

    expect(route.totalLength).toBeCloseTo(40, 5);
    expect(sampleTrafficRoutePoint(route, 5)).toMatchObject({ x: 0, y: 0, z: 5 });
    expect(sampleTrafficRoutePoint(route, 30)).toMatchObject({ x: 10, y: 0, z: 20 });
    expect(sampleTrafficRoutePoint(route, 200)).toMatchObject({ x: 20, y: 0, z: 20 });
  });
});
