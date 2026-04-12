import {
  resolveSceneGraphicsPresetProfile,
  resolveSceneStarterVehicleType
} from "../../src/rendering/scene/create-world-scene";

describe("create world scene", () => {
  it("keeps the sedan baseline unless a replay launch requests a different starter vehicle", () => {
    expect(resolveSceneStarterVehicleType()).toBe("sedan");
    expect(resolveSceneStarterVehicleType("sports-car")).toBe("sports-car");
    expect(resolveSceneStarterVehicleType("heavy-truck")).toBe("heavy-truck");
  });

  it("maps graphics presets to conservative explicit scene profiles", () => {
    expect(resolveSceneGraphicsPresetProfile("low")).toEqual({
      graphicsPreset: "low",
      hardwareScalingLevel: 1.5,
      lightIntensity: 0.82
    });
    expect(resolveSceneGraphicsPresetProfile("medium")).toEqual({
      graphicsPreset: "medium",
      hardwareScalingLevel: 1.25,
      lightIntensity: 0.95
    });
    expect(resolveSceneGraphicsPresetProfile("high")).toEqual({
      graphicsPreset: "high",
      hardwareScalingLevel: 1,
      lightIntensity: 1.05
    });
  });
});
