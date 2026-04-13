import type { BrowserFamily, BrowserSupportSnapshot } from "./platform";

export interface SceneBrowserSupportTelemetry {
  browserAudioContextAvailable: string;
  browserCapabilityDefaultGraphicsPreset: string;
  browserCapabilityDefaultPedestrianDensity: string;
  browserCapabilityDefaultTrafficDensity: string;
  browserCapabilityDefaultWorldSize: string;
  browserFamily: BrowserFamily;
  browserLocalStorageAvailable: string;
  browserMutationObserverAvailable: string;
  browserPerformanceNowAvailable: string;
  browserRequestIdleCallbackAvailable: string;
  browserSupportIssues: string;
  browserSupportTier: string;
  browserWebgl2Available: string;
}

export function createSceneBrowserSupportTelemetry(
  browserSupport: BrowserSupportSnapshot
): SceneBrowserSupportTelemetry {
  return {
    browserAudioContextAvailable: String(browserSupport.capabilities.audioContext),
    browserCapabilityDefaultGraphicsPreset: browserSupport.capabilityDefaults.graphicsPreset,
    browserCapabilityDefaultPedestrianDensity: browserSupport.capabilityDefaults.pedestrianDensity,
    browserCapabilityDefaultTrafficDensity: browserSupport.capabilityDefaults.trafficDensity,
    browserCapabilityDefaultWorldSize: browserSupport.capabilityDefaults.worldSize,
    browserFamily: browserSupport.browserFamily,
    browserLocalStorageAvailable: String(browserSupport.capabilities.localStorage),
    browserMutationObserverAvailable: String(browserSupport.capabilities.mutationObserver),
    browserPerformanceNowAvailable: String(browserSupport.capabilities.performanceNow),
    browserRequestIdleCallbackAvailable: String(browserSupport.capabilities.requestIdleCallback),
    browserSupportIssues: browserSupport.issues.join(","),
    browserSupportTier: browserSupport.supportTier,
    browserWebgl2Available: String(browserSupport.capabilities.webgl2)
  };
}
