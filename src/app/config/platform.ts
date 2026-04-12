import {
  HARD_FALLBACK_PLAYER_SETTINGS,
  parsePartialPlayerSettings,
  type PlayerSettings
} from "./settings-schema";

export type HardwareTier = "low" | "medium" | "high";

export interface PlatformSignalSnapshot {
  hardwareConcurrency: number | null;
  deviceMemoryGiB: number | null;
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

export function readBrowserPlatformSignals(
  navigatorLike: NavigatorWithDeviceMemory | null | undefined =
    typeof window === "undefined" ? null : (window.navigator as NavigatorWithDeviceMemory)
): PlatformSignalSnapshot {
  return {
    hardwareConcurrency: normalizeNumericSignal(navigatorLike?.hardwareConcurrency),
    deviceMemoryGiB: normalizeNumericSignal(navigatorLike?.deviceMemory)
  };
}

export function resolveCapabilityDefaultPlayerSettings(
  signals: Partial<PlatformSignalSnapshot> = readBrowserPlatformSignals()
): PlayerSettings {
  switch (detectHardwareTier(signals)) {
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
