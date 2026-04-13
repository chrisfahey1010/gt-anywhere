import { createSceneBrowserSupportTelemetry } from "../../src/app/config/browser-support-telemetry";
import { resolveSceneGraphicsPresetProfile, resolveSceneStarterVehicleType } from "../../src/rendering/scene/create-world-scene";
import type { BrowserSupportSnapshot } from "../../src/app/config/platform";

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

  it("maps browser support snapshots into explicit scene telemetry fields", () => {
    const browserSupport: BrowserSupportSnapshot = {
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
      issues: ["browser-family-concessions", "storage-unavailable", "request-idle-callback-unavailable"],
      supportTier: "degraded"
    };

    expect(createSceneBrowserSupportTelemetry(browserSupport)).toEqual({
      browserAudioContextAvailable: "true",
      browserCapabilityDefaultGraphicsPreset: "medium",
      browserCapabilityDefaultPedestrianDensity: "medium",
      browserCapabilityDefaultTrafficDensity: "medium",
      browserCapabilityDefaultWorldSize: "medium",
      browserFamily: "webkit",
      browserLocalStorageAvailable: "false",
      browserMutationObserverAvailable: "true",
      browserPerformanceNowAvailable: "true",
      browserRequestIdleCallbackAvailable: "false",
      browserSupportIssues: "browser-family-concessions,storage-unavailable,request-idle-callback-unavailable",
      browserSupportTier: "degraded",
      browserWebgl2Available: "true"
    });
  });
});
