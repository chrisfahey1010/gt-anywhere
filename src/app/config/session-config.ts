export const SESSION_SEED = "story-1-1";

export const SUPPORTED_LOCATION_ALIASES: Record<string, string> = {
  sf: "San Francisco, CA",
  "san francisco": "San Francisco, CA",
  "san francisco, ca": "San Francisco, CA",
  nyc: "New York, NY",
  "new york": "New York, NY",
  "new york city": "New York, NY",
  "times square": "Times Square, New York, NY",
  "1600 amphitheatre parkway, mountain view, ca": "1600 Amphitheatre Parkway, Mountain View, CA"
};

// Keep single-token support deterministic until Story 1 adds a real resolver.
export const SUPPORTED_SINGLE_TOKEN_LOCATIONS = new Set([
  "austin",
  "berlin",
  "boston",
  "brooklyn",
  "chicago",
  "dallas",
  "london",
  "manhattan",
  "miami",
  "oakland",
  "paris",
  "phoenix",
  "portland",
  "queens",
  "rome",
  "seattle",
  "sydney",
  "tokyo"
]);

export const RECOVERABLE_UNRESOLVABLE_QUERIES = new Set([
  "atlantis",
  "unknown",
  "asdf"
]);

export const WORLD_GENERATION_PIPELINE = [
  "LocationResolver",
  "GeoDataFetcher",
  "SliceBoundaryPlanner",
  "RoadNormalizer",
  "PlayabilityPassPipeline",
  "ChunkAssembler",
  "SpawnPlanner",
  "SliceManifestStore"
] as const;
