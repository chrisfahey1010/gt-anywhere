import {
  HARD_FALLBACK_PLAYER_SETTINGS,
  parsePartialPlayerSettings,
  splitGenerationPlayerSettings,
  splitRuntimePlayerSettings,
  type PlayerSettings
} from "../../src/app/config/settings-schema";
import {
  resolveBootPlayerSettings,
  resolveAudioPolishProfile,
  resolveBrowserSupportSnapshot,
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

  it("scales audio polish through graphics preset and browser-family defaults without adding a new settings surface", () => {
    expect(resolveAudioPolishProfile("low", "chromium")).toEqual({
      ambienceEnabled: false,
      cueVolumeScale: 0.75,
      profile: "low",
      vehicleHumEnabled: true
    });
    expect(resolveAudioPolishProfile("high", "firefox")).toEqual({
      ambienceEnabled: true,
      cueVolumeScale: 0.95,
      profile: "high",
      vehicleHumEnabled: true
    });
    expect(resolveAudioPolishProfile("high", "webkit")).toEqual({
      ambienceEnabled: false,
      cueVolumeScale: 0.85,
      profile: "high",
      vehicleHumEnabled: true
    });
  });

  it("derives an explicit supported-browser snapshot from typed platform and capability inputs", () => {
    expect(
      resolveBrowserSupportSnapshot({
        audioSupport: {
          available: true,
          unlockState: "uninitialized"
        },
        environmentCapabilities: {
          mutationObserver: true,
          performanceNow: true,
          requestIdleCallback: true,
          webgl2: true
        },
        signals: {
          browserFamily: "chromium",
          deviceMemoryGiB: 16,
          hardwareConcurrency: 16
        },
        storageAvailable: true
      })
    ).toEqual({
      browserFamily: "chromium",
      capabilities: {
        audioContext: true,
        localStorage: true,
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: true,
        webgl2: true
      },
      capabilityDefaults: {
        worldSize: "medium",
        graphicsPreset: "high",
        trafficDensity: "high",
        pedestrianDensity: "high"
      },
      hardwareTier: "high",
      issues: [],
      supportTier: "supported"
    });
  });

  it("marks browser concessions and recoverable capability gaps as degraded without widening settings", () => {
    expect(
      resolveBrowserSupportSnapshot({
        audioSupport: {
          available: true,
          unlockState: "blocked"
        },
        environmentCapabilities: {
          mutationObserver: true,
          performanceNow: true,
          requestIdleCallback: false,
          webgl2: true
        },
        signals: {
          browserFamily: "webkit",
          deviceMemoryGiB: 16,
          hardwareConcurrency: 16
        },
        storageAvailable: false
      })
    ).toEqual({
      browserFamily: "webkit",
      capabilities: {
        audioContext: true,
        localStorage: false,
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: false,
        webgl2: true
      },
      capabilityDefaults: {
        worldSize: "medium",
        graphicsPreset: "medium",
        trafficDensity: "medium",
        pedestrianDensity: "medium"
      },
      hardwareTier: "high",
      issues: ["browser-family-concessions", "audio-blocked", "storage-unavailable", "request-idle-callback-unavailable"],
      supportTier: "degraded"
    });
  });

  it("rejects unsupported browser baselines when the browser family or WebGL2 requirement is missing", () => {
    expect(
      resolveBrowserSupportSnapshot({
        audioSupport: {
          available: false,
          unlockState: "unsupported"
        },
        environmentCapabilities: {
          mutationObserver: true,
          performanceNow: true,
          requestIdleCallback: true,
          webgl2: false
        },
        signals: {
          browserFamily: "unknown",
          deviceMemoryGiB: 8,
          hardwareConcurrency: 8
        },
        storageAvailable: true
      })
    ).toEqual({
      browserFamily: "unknown",
      capabilities: {
        audioContext: false,
        localStorage: true,
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: true,
        webgl2: false
      },
      capabilityDefaults: {
        worldSize: "medium",
        graphicsPreset: "medium",
        trafficDensity: "medium",
        pedestrianDensity: "medium"
      },
      hardwareTier: "medium",
      issues: ["unsupported-browser-family", "webgl2-unavailable", "audio-unavailable"],
      supportTier: "unsupported"
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
