export const WORLD_SIZE_OPTIONS = ["small", "medium", "large"] as const;

export const GRAPHICS_PRESET_OPTIONS = ["low", "medium", "high"] as const;

export const TRAFFIC_DENSITY_OPTIONS = ["low", "medium", "high"] as const;

export const PEDESTRIAN_DENSITY_OPTIONS = ["off", "low", "medium", "high"] as const;

export type WorldSize = (typeof WORLD_SIZE_OPTIONS)[number];

export type GraphicsPreset = (typeof GRAPHICS_PRESET_OPTIONS)[number];

export type TrafficDensity = (typeof TRAFFIC_DENSITY_OPTIONS)[number];

export type PedestrianDensity = (typeof PEDESTRIAN_DENSITY_OPTIONS)[number];

export interface PlayerSettings {
  worldSize: WorldSize;
  graphicsPreset: GraphicsPreset;
  trafficDensity: TrafficDensity;
  pedestrianDensity: PedestrianDensity;
}

export interface GenerationPlayerSettings {
  worldSize: WorldSize;
  trafficDensity: TrafficDensity;
  pedestrianDensity: PedestrianDensity;
}

export interface RuntimePlayerSettings {
  graphicsPreset: GraphicsPreset;
}

export const HARD_FALLBACK_PLAYER_SETTINGS: PlayerSettings = {
  worldSize: "medium",
  graphicsPreset: "medium",
  trafficDensity: "medium",
  pedestrianDensity: "medium"
};

function includesValue<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && options.includes(value as T);
}

export function isWorldSize(value: unknown): value is WorldSize {
  return includesValue(WORLD_SIZE_OPTIONS, value);
}

export function isGraphicsPreset(value: unknown): value is GraphicsPreset {
  return includesValue(GRAPHICS_PRESET_OPTIONS, value);
}

export function isTrafficDensity(value: unknown): value is TrafficDensity {
  return includesValue(TRAFFIC_DENSITY_OPTIONS, value);
}

export function isPedestrianDensity(value: unknown): value is PedestrianDensity {
  return includesValue(PEDESTRIAN_DENSITY_OPTIONS, value);
}

export function parsePartialPlayerSettings(value: unknown): Partial<PlayerSettings> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const parsed: Partial<PlayerSettings> = {};

  if (isWorldSize(candidate.worldSize)) {
    parsed.worldSize = candidate.worldSize;
  }

  if (isGraphicsPreset(candidate.graphicsPreset)) {
    parsed.graphicsPreset = candidate.graphicsPreset;
  }

  if (isTrafficDensity(candidate.trafficDensity)) {
    parsed.trafficDensity = candidate.trafficDensity;
  }

  if (isPedestrianDensity(candidate.pedestrianDensity)) {
    parsed.pedestrianDensity = candidate.pedestrianDensity;
  }

  return parsed;
}

export function isCompletePlayerSettings(value: Partial<PlayerSettings>): value is PlayerSettings {
  return (
    isWorldSize(value.worldSize) &&
    isGraphicsPreset(value.graphicsPreset) &&
    isTrafficDensity(value.trafficDensity) &&
    isPedestrianDensity(value.pedestrianDensity)
  );
}

export function splitGenerationPlayerSettings(settings: PlayerSettings): GenerationPlayerSettings {
  return {
    worldSize: settings.worldSize,
    trafficDensity: settings.trafficDensity,
    pedestrianDensity: settings.pedestrianDensity
  };
}

export function splitRuntimePlayerSettings(settings: PlayerSettings): RuntimePlayerSettings {
  return {
    graphicsPreset: settings.graphicsPreset
  };
}

export function arePlayerSettingsEqual(left: PlayerSettings | null, right: PlayerSettings | null): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return (
    left.worldSize === right.worldSize &&
    left.graphicsPreset === right.graphicsPreset &&
    left.trafficDensity === right.trafficDensity &&
    left.pedestrianDensity === right.pedestrianDensity
  );
}
