import type { SliceRoad } from "../../src/world/chunks/slice-manifest";
import {
  formatFallbackRoadDisplayName,
  resolveCurrentRoad
} from "../../src/rendering/scene/world-navigation";

describe("world navigation helpers", () => {
  it("formats deterministic friendly labels for generated roads", () => {
    expect(formatFallbackRoadDisplayName("primary", 0)).toBe("Arterial Road");
    expect(formatFallbackRoadDisplayName("secondary", 0)).toBe("Cross Street");
    expect(formatFallbackRoadDisplayName("tertiary", 0)).toBe("Connector Lane");
    expect(formatFallbackRoadDisplayName("primary", 1)).toBe("Arterial Road 2");
  });

  it("prefers the previously selected road while it stays within tolerance", () => {
    const roads: SliceRoad[] = [
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
          { x: 0, y: 0, z: -100 },
          { x: 0, y: 0, z: 100 }
        ]
      }
    ];

    const resolvedRoad = resolveCurrentRoad({
      roads,
      position: { x: 2, z: 1 },
      previousRoadId: "market-st"
    });

    expect(resolvedRoad?.id).toBe("market-st");
  });

  it("breaks equal-distance ties by road kind priority and lexical id", () => {
    const roads: SliceRoad[] = [
      {
        id: "zeta-road",
        displayName: "Zeta Road",
        kind: "secondary",
        width: 12,
        points: [
          { x: -100, y: 0, z: 10 },
          { x: 100, y: 0, z: 10 }
        ]
      },
      {
        id: "alpha-road",
        displayName: "Alpha Road",
        kind: "secondary",
        width: 12,
        points: [
          { x: -100, y: 0, z: -10 },
          { x: 100, y: 0, z: -10 }
        ]
      },
      {
        id: "broadway",
        displayName: "Broadway",
        kind: "primary",
        width: 18,
        points: [
          { x: 10, y: 0, z: -100 },
          { x: 10, y: 0, z: 100 }
        ]
      }
    ];

    expect(
      resolveCurrentRoad({
        roads,
        position: { x: 0, z: 0 }
      })?.id
    ).toBe("broadway");

    expect(
      resolveCurrentRoad({
        roads: roads.filter((road) => road.kind === "secondary"),
        position: { x: 0, z: 0 }
      })?.id
    ).toBe("alpha-road");
  });

  it("returns null when no road is close enough to the actor position", () => {
    const roads: SliceRoad[] = [
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
    ];

    expect(
      resolveCurrentRoad({
        roads,
        position: { x: 0, z: 200 }
      })
    ).toBeNull();
  });
});
