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
      boundaryAlpha: 0.18,
      fillLightIntensity: 0.12,
      fogDensity: 0,
      graphicsPreset: "low",
      hardwareScalingLevel: 1.5,
      lightIntensity: 0.82
    });
    expect(resolveSceneGraphicsPresetProfile("medium")).toEqual({
      boundaryAlpha: 0.24,
      fillLightIntensity: 0.18,
      fogDensity: 0.0009,
      graphicsPreset: "medium",
      hardwareScalingLevel: 1.25,
      lightIntensity: 0.95
    });
    expect(resolveSceneGraphicsPresetProfile("high")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.24,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1,
      lightIntensity: 1.05
    });
  });

  it("adds explicit browser-family fallbacks without changing the selected graphics preset", () => {
    expect(resolveSceneGraphicsPresetProfile("high", "chromium")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.24,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1,
      lightIntensity: 1.05
    });
    expect(resolveSceneGraphicsPresetProfile("high", "firefox")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.23,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1.1,
      lightIntensity: 1.02
    });
    expect(resolveSceneGraphicsPresetProfile("high", "webkit")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.23,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1.2,
      lightIntensity: 0.99
    });
  });
});
