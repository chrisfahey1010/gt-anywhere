import type {
  BreakablePropType,
  SliceSceneMetadata,
  SliceSceneVisualPalette,
  SliceSceneVisualPaletteOverrides
} from "./slice-manifest";

const DEFAULT_SCENE_METADATA: SliceSceneMetadata = {
  boundaryColor: "#8ec5fc",
  displayName: "Unknown Slice",
  districtName: "Unknown District",
  groundColor: "#263238",
  roadColor: "#f6d365"
};

const DEFAULT_PROP_COLORS: Record<BreakablePropType, string> = {
  barrier: "#ffb74d",
  bollard: "#b0bec5",
  hydrant: "#ef5350",
  "short-post": "#90a4ae",
  signpost: "#f6d365"
};

export const DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES: Readonly<SliceSceneVisualPaletteOverrides> = {
  chunkColor: "#52616b",
  hazeColor: "#d8ecff",
  pedestrianColor: "#f4cda6",
  propColors: DEFAULT_PROP_COLORS,
  skyColor: "#9fd4ff",
  vehicleAccentColor: "#f0dfbf"
};

export function resolveSceneVisualPalette(sceneMetadata?: SliceSceneMetadata): SliceSceneVisualPalette {
  const metadata = sceneMetadata ?? DEFAULT_SCENE_METADATA;
  const palette = metadata.palette ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES;

  return {
    boundaryColor: metadata.boundaryColor,
    chunkColor: palette.chunkColor ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.chunkColor ?? "#52616b",
    groundColor: metadata.groundColor,
    hazeColor: palette.hazeColor ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.hazeColor ?? "#d8ecff",
    pedestrianColor: palette.pedestrianColor ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.pedestrianColor ?? "#f4cda6",
    propColors: {
      ...DEFAULT_PROP_COLORS,
      ...(palette.propColors ?? {})
    },
    roadColor: metadata.roadColor,
    skyColor: palette.skyColor ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.skyColor ?? "#9fd4ff",
    vehicleAccentColor:
      palette.vehicleAccentColor ?? DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.vehicleAccentColor ?? "#f0dfbf"
  };
}
