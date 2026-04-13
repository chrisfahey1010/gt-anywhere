import {
  arePlayerSettingsEqual,
  HARD_FALLBACK_PLAYER_SETTINGS,
  parsePartialPlayerSettings,
  type GraphicsPreset,
  type PlayerSettings
} from "./settings-schema";

export type BrowserFamily = "chromium" | "firefox" | "webkit" | "unknown";
export type HardwareTier = "low" | "medium" | "high";
export type BrowserSupportTier = "supported" | "degraded" | "unsupported";
export type BrowserSupportIssue =
  | "audio-blocked"
  | "audio-unavailable"
  | "browser-family-concessions"
  | "mutation-observer-unavailable"
  | "performance-now-unavailable"
  | "request-idle-callback-unavailable"
  | "storage-unavailable"
  | "unsupported-browser-family"
  | "webgl2-unavailable";

export interface BrowserAudioSupportState {
  available: boolean;
  unlockState: "blocked" | "uninitialized" | "unlocked" | "unsupported";
}

export interface BrowserEnvironmentCapabilities {
  mutationObserver: boolean;
  performanceNow: boolean;
  requestIdleCallback: boolean;
  webgl2: boolean;
}

export interface BrowserSupportCapabilities extends BrowserEnvironmentCapabilities {
  audioContext: boolean;
  localStorage: boolean;
}

export interface BrowserSupportSnapshot {
  browserFamily: BrowserFamily;
  capabilities: BrowserSupportCapabilities;
  capabilityDefaults: PlayerSettings;
  hardwareTier: HardwareTier;
  issues: BrowserSupportIssue[];
  supportTier: BrowserSupportTier;
}

export interface PlatformSignalSnapshot {
  browserFamily: BrowserFamily;
  hardwareConcurrency: number | null;
  deviceMemoryGiB: number | null;
}

export interface AudioPolishProfile {
  ambienceEnabled: boolean;
  cueVolumeScale: number;
  profile: GraphicsPreset;
  vehicleHumEnabled: boolean;
}

interface ResolvePlayerSettingsOptions {
  capabilityDefaults?: Partial<PlayerSettings> | null;
  hardFallback?: PlayerSettings;
  savedSettings?: Partial<PlayerSettings> | null;
}

interface ResolveInteractivePlayerSettingsOptions extends ResolvePlayerSettingsOptions {
  explicitShellSettings?: Partial<PlayerSettings> | null;
}

export interface ResolveBrowserSupportSnapshotOptions {
  audioSupport?: BrowserAudioSupportState | null;
  capabilityDefaults?: PlayerSettings | null;
  environmentCapabilities?: Partial<BrowserEnvironmentCapabilities> | null;
  signals?: Partial<PlatformSignalSnapshot>;
  storageAvailable?: boolean | null;
}

export interface ReadBrowserEnvironmentCapabilitiesOptions {
  documentLike?: Document | null;
  includeWebgl2Probe?: boolean;
}

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

function detectBrowserFamily(userAgent: unknown): BrowserFamily {
  const normalizedUserAgent = typeof userAgent === "string" ? userAgent.toLowerCase() : "";

  if (normalizedUserAgent.includes("firefox/")) {
    return "firefox";
  }

  if (
    normalizedUserAgent.includes("applewebkit") &&
    normalizedUserAgent.includes("safari/") &&
    !normalizedUserAgent.includes("chrome/") &&
    !normalizedUserAgent.includes("chromium") &&
    !normalizedUserAgent.includes("edg/")
  ) {
    return "webkit";
  }

  if (
    normalizedUserAgent.includes("chrome/") ||
    normalizedUserAgent.includes("chromium") ||
    normalizedUserAgent.includes("edg/")
  ) {
    return "chromium";
  }

  return "unknown";
}

function normalizeNumericSignal(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function detectHardwareTier(signals: Partial<PlatformSignalSnapshot>): HardwareTier {
  const hardwareConcurrency = normalizeNumericSignal(signals.hardwareConcurrency);
  const deviceMemoryGiB = normalizeNumericSignal(signals.deviceMemoryGiB);

  if (
    (hardwareConcurrency !== null && hardwareConcurrency <= 4) ||
    (deviceMemoryGiB !== null && deviceMemoryGiB <= 4)
  ) {
    return "low";
  }

  if (
    (hardwareConcurrency !== null && hardwareConcurrency >= 12) ||
    (deviceMemoryGiB !== null && deviceMemoryGiB >= 16)
  ) {
    return "high";
  }

  return "medium";
}

function resolveHardwareTierCapabilityDefaults(hardwareTier: HardwareTier): PlayerSettings {
  switch (hardwareTier) {
    case "low":
      return {
        worldSize: "medium",
        graphicsPreset: "low",
        trafficDensity: "low",
        pedestrianDensity: "low"
      };

    case "high":
      return {
        worldSize: "medium",
        graphicsPreset: "high",
        trafficDensity: "high",
        pedestrianDensity: "high"
      };

    case "medium":
    default:
      return { ...HARD_FALLBACK_PLAYER_SETTINGS };
  }
}

function mergePlayerSettingsLayers(
  hardFallback: PlayerSettings,
  ...layers: Array<Partial<PlayerSettings> | null | undefined>
): PlayerSettings {
  const resolved: PlayerSettings = { ...hardFallback };

  for (const layer of layers) {
    Object.assign(resolved, parsePartialPlayerSettings(layer));
  }

  return resolved;
}

function resolveBrowserAdjustedDefaults(baseDefaults: PlayerSettings, browserFamily: BrowserFamily): PlayerSettings {
  switch (browserFamily) {
    case "firefox":
      return {
        ...baseDefaults,
        graphicsPreset: baseDefaults.graphicsPreset === "high" ? "medium" : baseDefaults.graphicsPreset
      };

    case "webkit":
      return {
        ...baseDefaults,
        graphicsPreset:
          baseDefaults.graphicsPreset === "high"
            ? "medium"
            : baseDefaults.graphicsPreset === "medium"
              ? "low"
              : baseDefaults.graphicsPreset,
        trafficDensity:
          baseDefaults.trafficDensity === "high"
            ? "medium"
            : baseDefaults.trafficDensity === "medium"
              ? "low"
              : baseDefaults.trafficDensity,
        pedestrianDensity:
          baseDefaults.pedestrianDensity === "high"
            ? "medium"
            : baseDefaults.pedestrianDensity === "medium"
              ? "low"
              : baseDefaults.pedestrianDensity
      };

    case "chromium":
    case "unknown":
    default:
      return baseDefaults;
  }
}

function detectWebgl2Support(documentLike: Document | null): boolean {
  if (documentLike === null) {
    return false;
  }

  const canvas = documentLike.createElement("canvas");
  const getContext = canvas.getContext;

  if (typeof getContext !== "function") {
    return false;
  }

  try {
    return getContext.call(canvas, "webgl2") !== null;
  } catch {
    return false;
  }
}

function resolveBrowserSupportCapabilities(options: ResolveBrowserSupportSnapshotOptions): BrowserSupportCapabilities {
  const environmentCapabilities = options.environmentCapabilities ?? {};
  const audioSupport = options.audioSupport ?? {
    available: true,
    unlockState: "uninitialized" as const
  };

  return {
    audioContext: audioSupport.available,
    localStorage: options.storageAvailable ?? true,
    mutationObserver: environmentCapabilities.mutationObserver ?? true,
    performanceNow: environmentCapabilities.performanceNow ?? true,
    requestIdleCallback: environmentCapabilities.requestIdleCallback ?? true,
    webgl2: environmentCapabilities.webgl2 ?? true
  };
}

function resolveBrowserSupportIssues(
  browserFamily: BrowserFamily,
  capabilities: BrowserSupportCapabilities,
  capabilityDefaults: PlayerSettings,
  hardwareTier: HardwareTier,
  audioSupport: BrowserAudioSupportState
): BrowserSupportIssue[] {
  const issues: BrowserSupportIssue[] = [];
  const hardwareTierDefaults = resolveHardwareTierCapabilityDefaults(hardwareTier);

  if (browserFamily === "unknown") {
    issues.push("unsupported-browser-family");
  }

  if (!capabilities.webgl2) {
    issues.push("webgl2-unavailable");
  }

  if (!arePlayerSettingsEqual(capabilityDefaults, hardwareTierDefaults)) {
    issues.push("browser-family-concessions");
  }

  if (!audioSupport.available) {
    issues.push("audio-unavailable");
  } else if (audioSupport.unlockState === "blocked") {
    issues.push("audio-blocked");
  }

  if (!capabilities.localStorage) {
    issues.push("storage-unavailable");
  }

  if (!capabilities.mutationObserver) {
    issues.push("mutation-observer-unavailable");
  }

  if (!capabilities.performanceNow) {
    issues.push("performance-now-unavailable");
  }

  if (!capabilities.requestIdleCallback) {
    issues.push("request-idle-callback-unavailable");
  }

  return issues;
}

function resolveBrowserSupportTier(issues: readonly BrowserSupportIssue[]): BrowserSupportTier {
  if (issues.includes("unsupported-browser-family") || issues.includes("webgl2-unavailable")) {
    return "unsupported";
  }

  return issues.length > 0 ? "degraded" : "supported";
}

export function readBrowserEnvironmentCapabilities(
  options: ReadBrowserEnvironmentCapabilitiesOptions = {}
): BrowserEnvironmentCapabilities {
  const includeWebgl2Probe = options.includeWebgl2Probe ?? true;
  const documentLike = options.documentLike ?? (typeof document === "undefined" ? null : document);

  return {
    mutationObserver: typeof MutationObserver === "function",
    performanceNow: typeof performance !== "undefined" && typeof performance.now === "function",
    requestIdleCallback: typeof requestIdleCallback === "function",
    webgl2: includeWebgl2Probe ? detectWebgl2Support(documentLike) : true
  };
}

export function resolveBrowserSupportSnapshot(options: ResolveBrowserSupportSnapshotOptions = {}): BrowserSupportSnapshot {
  const signals = options.signals ?? readBrowserPlatformSignals();
  const browserFamily = signals.browserFamily ?? "unknown";
  const hardwareTier = detectHardwareTier(signals);
  const capabilityDefaults = options.capabilityDefaults ?? resolveCapabilityDefaultPlayerSettings(signals);
  const audioSupport = options.audioSupport ?? {
    available: true,
    unlockState: "uninitialized" as const
  };
  const capabilities = resolveBrowserSupportCapabilities(options);
  const issues = resolveBrowserSupportIssues(browserFamily, capabilities, capabilityDefaults, hardwareTier, audioSupport);

  return {
    browserFamily,
    capabilities,
    capabilityDefaults,
    hardwareTier,
    issues,
    supportTier: resolveBrowserSupportTier(issues)
  };
}

export function resolveAudioPolishProfile(
  graphicsPreset: GraphicsPreset,
  browserFamily: BrowserFamily = "unknown"
): AudioPolishProfile {
  const baseProfile: AudioPolishProfile =
    graphicsPreset === "low"
      ? {
          ambienceEnabled: false,
          cueVolumeScale: 0.75,
          profile: "low",
          vehicleHumEnabled: true
        }
      : graphicsPreset === "medium"
        ? {
            ambienceEnabled: true,
            cueVolumeScale: 0.9,
            profile: "medium",
            vehicleHumEnabled: true
          }
        : {
            ambienceEnabled: true,
            cueVolumeScale: 1,
            profile: "high",
            vehicleHumEnabled: true
          };

  switch (browserFamily) {
    case "firefox":
      return {
        ...baseProfile,
        cueVolumeScale: Math.round(baseProfile.cueVolumeScale * 0.95 * 100) / 100
      };

    case "webkit":
      return {
        ...baseProfile,
        ambienceEnabled: false,
        cueVolumeScale: Math.round(baseProfile.cueVolumeScale * 0.85 * 100) / 100
      };

    case "chromium":
    case "unknown":
    default:
      return baseProfile;
  }
}

export function readBrowserPlatformSignals(
  navigatorLike: NavigatorWithDeviceMemory | null | undefined =
    typeof window === "undefined" ? null : (window.navigator as NavigatorWithDeviceMemory)
): PlatformSignalSnapshot {
  return {
    browserFamily: detectBrowserFamily(navigatorLike?.userAgent),
    hardwareConcurrency: normalizeNumericSignal(navigatorLike?.hardwareConcurrency),
    deviceMemoryGiB: normalizeNumericSignal(navigatorLike?.deviceMemory)
  };
}

export function resolveCapabilityDefaultPlayerSettings(
  signals: Partial<PlatformSignalSnapshot> = readBrowserPlatformSignals()
): PlayerSettings {
  const hardwareTier = detectHardwareTier(signals);
  const browserFamily = signals.browserFamily ?? "unknown";

  return resolveBrowserAdjustedDefaults(resolveHardwareTierCapabilityDefaults(hardwareTier), browserFamily);
}

export function resolveBootPlayerSettings(options: ResolvePlayerSettingsOptions = {}): PlayerSettings {
  const hardFallback = options.hardFallback ?? HARD_FALLBACK_PLAYER_SETTINGS;
  const capabilityDefaults = options.capabilityDefaults ?? resolveCapabilityDefaultPlayerSettings();

  return mergePlayerSettingsLayers(hardFallback, capabilityDefaults, options.savedSettings);
}

export function resolveInteractivePlayerSettings(
  options: ResolveInteractivePlayerSettingsOptions = {}
): PlayerSettings {
  const hardFallback = options.hardFallback ?? HARD_FALLBACK_PLAYER_SETTINGS;
  const capabilityDefaults = options.capabilityDefaults ?? resolveCapabilityDefaultPlayerSettings();

  return mergePlayerSettingsLayers(
    hardFallback,
    capabilityDefaults,
    options.savedSettings,
    options.explicitShellSettings
  );
}
