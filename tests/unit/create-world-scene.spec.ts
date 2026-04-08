import { resolveSceneStarterVehicleType } from "../../src/rendering/scene/create-world-scene";

describe("create world scene", () => {
  it("keeps the sedan baseline unless a replay launch requests a different starter vehicle", () => {
    expect(resolveSceneStarterVehicleType()).toBe("sedan");
    expect(resolveSceneStarterVehicleType("sports-car")).toBe("sports-car");
    expect(resolveSceneStarterVehicleType("heavy-truck")).toBe("heavy-truck");
  });
});
