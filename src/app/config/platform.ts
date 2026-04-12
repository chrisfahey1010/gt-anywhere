import {
  HARD_FALLBACK_PLAYER_SETTINGS,
  parsePartialPlayerSettings,
  type GraphicsPreset,
  type PlayerSettings
} from "./settings-schema";

export type BrowserFamily = "chromium" | "firefox" | "webkit" | "unknown";
export type HardwareTier = "low" | "medium" | "high";

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

  switch (hardwareTier) {
    case "low":
      return resolveBrowserAdjustedDefaults(
        {
          worldSize: "medium",
          graphicsPreset: "low",
          trafficDensity: "low",
          pedestrianDensity: "low"
        },
        browserFamily
      );

    case "high":
      return resolveBrowserAdjustedDefaults(
        {
          worldSize: "medium",
          graphicsPreset: "high",
          trafficDensity: "high",
          pedestrianDensity: "high"
        },
        browserFamily
      );

    case "medium":
    default:
      return resolveBrowserAdjustedDefaults({ ...HARD_FALLBACK_PLAYER_SETTINGS }, browserFamily);
  }
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
