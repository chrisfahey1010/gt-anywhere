import {
  HARD_FALLBACK_PLAYER_SETTINGS,
  parsePartialPlayerSettings,
  splitGenerationPlayerSettings,
  splitRuntimePlayerSettings,
  type PlayerSettings
} from "../../src/app/config/settings-schema";
import {
  resolveBootPlayerSettings,
  resolveCapabilityDefaultPlayerSettings,
  resolveInteractivePlayerSettings
} from "../../src/app/config/platform";

describe("player settings", () => {
  const explicitSettings: PlayerSettings = {
    worldSize: "large",
    graphicsPreset: "low",
    trafficDensity: "high",
    pedestrianDensity: "off"
  };

  it("keeps the shipped 4.1 settings contract bounded to generation and runtime seams", () => {
    expect(
      parsePartialPlayerSettings({
        ...explicitSettings,
        drawDistance: "far",
        motionBlur: true
      })
    ).toEqual(explicitSettings);
    expect(splitGenerationPlayerSettings(explicitSettings)).toEqual({
      worldSize: "large",
      trafficDensity: "high",
      pedestrianDensity: "off"
    });
    expect(splitRuntimePlayerSettings(explicitSettings)).toEqual({
      graphicsPreset: "low"
    });
  });

  it("filters invalid saved values instead of widening the settings contract", () => {
    expect(
      parsePartialPlayerSettings({
        worldSize: "giant",
        graphicsPreset: "medium",
        trafficDensity: "crowded",
        pedestrianDensity: "off"
      })
    ).toEqual({
      graphicsPreset: "medium",
      pedestrianDensity: "off"
    });
  });

  it("derives conservative capability defaults without displacing medium as the world-size fallback", () => {
    expect(
      resolveCapabilityDefaultPlayerSettings({
        hardwareConcurrency: 2,
        deviceMemoryGiB: 4
      })
    ).toEqual({
      worldSize: "medium",
      graphicsPreset: "low",
      trafficDensity: "low",
      pedestrianDensity: "low"
    });
    expect(
      resolveCapabilityDefaultPlayerSettings({
        hardwareConcurrency: 16,
        deviceMemoryGiB: 16
      })
    ).toEqual({
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "high",
      pedestrianDensity: "high"
    });
    expect(HARD_FALLBACK_PLAYER_SETTINGS.worldSize).toBe("medium");
  });

  it("keeps supported-browser capability defaults conservative through the existing settings contract", () => {
    expect(
      resolveCapabilityDefaultPlayerSettings({
        browserFamily: "firefox",
        hardwareConcurrency: 16,
        deviceMemoryGiB: 16
      })
    ).toEqual({
      worldSize: "medium",
      graphicsPreset: "medium",
      trafficDensity: "high",
      pedestrianDensity: "high"
    });
    expect(
      resolveCapabilityDefaultPlayerSettings({
        browserFamily: "webkit",
        hardwareConcurrency: 16,
        deviceMemoryGiB: 16
      })
    ).toEqual({
      worldSize: "medium",
      graphicsPreset: "medium",
      trafficDensity: "medium",
      pedestrianDensity: "medium"
    });
  });

  it("hydrates boot settings with saved values before capability defaults and hard fallbacks", () => {
    expect(
      resolveBootPlayerSettings({
        savedSettings: {
          graphicsPreset: "high",
          trafficDensity: "medium"
        },
        capabilityDefaults: {
          worldSize: "medium",
          graphicsPreset: "low",
          trafficDensity: "low",
          pedestrianDensity: "low"
        }
      })
    ).toEqual({
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "medium",
      pedestrianDensity: "low"
    });
  });

  it("prefers current shell edits over saved values during interactive resolution", () => {
    expect(
      resolveInteractivePlayerSettings({
        explicitShellSettings: {
          worldSize: "large",
          trafficDensity: "high"
        },
        savedSettings: {
          graphicsPreset: "high",
          trafficDensity: "medium"
        },
        capabilityDefaults: {
          worldSize: "medium",
          graphicsPreset: "low",
          trafficDensity: "low",
          pedestrianDensity: "low"
        }
      })
    ).toEqual({
      worldSize: "large",
      graphicsPreset: "high",
      trafficDensity: "high",
      pedestrianDensity: "low"
    });
  });
});
