import {
  REPLAY_INTENTION_OPTIONS,
  REPLAY_VEHICLE_OPTIONS,
  getReplaySelectionById
} from "../../src/app/config/replay-options";

describe("replay options", () => {
  it("keeps direct vehicle replays and intention presets in one canonical launch seam", () => {
    expect(REPLAY_VEHICLE_OPTIONS.map((option) => option.selection.id)).toEqual([
      "vehicle-sedan",
      "vehicle-sports-car",
      "vehicle-heavy-truck"
    ]);
    expect(REPLAY_VEHICLE_OPTIONS.map((option) => option.selection.starterVehicleType)).toEqual([
      "sedan",
      "sports-car",
      "heavy-truck"
    ]);
    expect(REPLAY_INTENTION_OPTIONS).toMatchObject([
      {
        selection: {
          id: "intention-cruise",
          kind: "intention",
          label: "Cruise",
          starterVehicleType: "sedan"
        }
      },
      {
        selection: {
          id: "intention-precision",
          kind: "intention",
          label: "Precision",
          starterVehicleType: "sports-car"
        }
      },
      {
        selection: {
          id: "intention-chaos",
          kind: "intention",
          label: "Chaos",
          starterVehicleType: "heavy-truck"
        }
      }
    ]);
  });

  it("resolves replay selections by id without mixing them into location identity", () => {
    expect(getReplaySelectionById("vehicle-heavy-truck")).toMatchObject({
      id: "vehicle-heavy-truck",
      kind: "vehicle",
      label: "Heavy Truck",
      starterVehicleType: "heavy-truck"
    });
    expect(getReplaySelectionById("intention-precision")).toMatchObject({
      id: "intention-precision",
      kind: "intention",
      label: "Precision",
      starterVehicleType: "sports-car"
    });
    expect(getReplaySelectionById("missing-option")).toBeNull();
  });
});
