import { describe, expect, it } from "vitest";
import { createBreakablePropSystem } from "../../src/sandbox/chaos/breakable-prop-system";

describe("breakable prop system", () => {
  it("breaks props once after an eligible impact and keeps the transition one-way", () => {
    const system = createBreakablePropSystem({
      props: [
        {
          chunkId: "chunk-0-0",
          headingDegrees: 0,
          id: "market-st-signpost-0-0",
          position: { x: 8, y: 0, z: 12 },
          propType: "signpost",
          roadId: "market-st",
          startDistance: 18
        },
        {
          chunkId: "chunk-0-0",
          headingDegrees: 0,
          id: "market-st-bollard-0-1",
          position: { x: 10, y: 0, z: 18 },
          propType: "bollard",
          roadId: "market-st",
          startDistance: 24
        }
      ]
    });

    expect(
      system.update({
        currentTimeSeconds: 1,
        impacts: [
          {
            impactSpeed: 5.5,
            propId: "market-st-signpost-0-0",
            sourceId: "starter-vehicle"
          }
        ]
      })
    ).toEqual([]);

    expect(
      system.update({
        currentTimeSeconds: 1.1,
        impacts: [
          {
            impactSpeed: 8,
            propId: "market-st-signpost-0-0",
            sourceId: "starter-vehicle"
          }
        ]
      })
    ).toEqual([
      expect.objectContaining({
        impactSpeed: 8,
        propId: "market-st-signpost-0-0",
        propType: "signpost",
        sourceId: "starter-vehicle",
        type: "prop.broken"
      })
    ]);

    expect(system.getProps()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          breakState: "broken",
          id: "market-st-signpost-0-0"
        }),
        expect.objectContaining({
          breakState: "intact",
          id: "market-st-bollard-0-1"
        })
      ])
    );

    expect(
      system.update({
        currentTimeSeconds: 1.2,
        impacts: [
          {
            impactSpeed: 12,
            propId: "market-st-signpost-0-0",
            sourceId: "starter-vehicle"
          }
        ]
      })
    ).toEqual([]);
  });
});
