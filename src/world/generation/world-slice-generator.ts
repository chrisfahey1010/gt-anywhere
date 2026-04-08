import type {
  SliceBounds,
  SliceChunk,
  SliceManifest,
  SliceRoad,
  SpawnCandidate
} from "../chunks/slice-manifest";
import type { SessionLocationIdentity, WorldGenerationRequest } from "./location-resolver";
import { InMemorySliceManifestStore, type SliceManifestStore } from "./slice-manifest-store";
import { createWorldLoadFailure, type WorldLoadFailure } from "./world-load-failure";
import { applyRoadDisplayNames } from "./road-display-name";

interface StoredGeoDataPreset extends GeoDataPreset {
  reuseKey: string;
}

export interface GeoDataPreset {
  presetId: string;
  displayName: string;
  districtName: string;
  bounds: SliceBounds;
  roads: SliceRoad[];
}

export interface GeoDataPresetSource {
  fetch(reuseKey: string): Promise<GeoDataPreset | null>;
}

export interface WorldSliceGenerationSuccess {
  ok: true;
  manifest: SliceManifest;
  spawnCandidate: SpawnCandidate;
}

export type WorldSliceGenerationResult = WorldSliceGenerationSuccess | WorldLoadFailure;

export interface WorldSliceGenerator {
  generate(request: WorldGenerationRequest): Promise<WorldSliceGenerationResult>;
  getStoredManifest?(sliceId: string): SliceManifest | null;
  getStoredManifestByReuseKey?(reuseKey: string): SliceManifest | null;
}

export interface DefaultWorldSliceGeneratorOptions {
  geoDataPresetSource?: GeoDataPresetSource;
  manifestStore?: SliceManifestStore;
  generationVersion?: string;
}

function hashValue(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function clampRoadPoint(point: SliceRoad["points"][number], bounds: SliceBounds): SliceRoad["points"][number] {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
    y: point.y,
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, point.z))
  };
}

function chooseDistrictName(identity: SessionLocationIdentity): string {
  const [primarySegment] = identity.placeName.split(",");

  return primarySegment?.trim() || identity.placeName;
}

function createFallbackPreset(identity: SessionLocationIdentity): GeoDataPreset {
  const hash = hashValue(identity.reuseKey);
  const width = 720 + (hash % 5) * 40;
  const depth = 680 + ((hash >> 3) % 5) * 40;
  const diagonalOffset = ((hash >> 5) % 160) - 80;
  const crossOffset = ((hash >> 7) % 160) - 80;
  const laneOffset = ((hash >> 9) % 120) - 60;
  const bounds = {
    minX: -width / 2,
    maxX: width / 2,
    minZ: -depth / 2,
    maxZ: depth / 2
  };

  return {
    presetId: `derived-${identity.reuseKey}`,
    displayName: identity.placeName,
    districtName: chooseDistrictName(identity),
    bounds,
    roads: [
      {
        id: `${identity.reuseKey}-arterial`,
        kind: "primary",
        width: 18,
        points: [
          { x: bounds.minX + 80, y: 0, z: diagonalOffset },
          { x: bounds.maxX - 80, y: 0, z: diagonalOffset }
        ]
      },
      {
        id: `${identity.reuseKey}-cross`,
        kind: "secondary",
        width: 14,
        points: [
          { x: crossOffset, y: 0, z: bounds.minZ + 80 },
          { x: crossOffset, y: 0, z: bounds.maxZ - 80 }
        ]
      },
      {
        id: `${identity.reuseKey}-connector`,
        kind: "tertiary",
        width: 12,
        points: [
          { x: bounds.minX + 120, y: 0, z: bounds.minZ + 120 },
          { x: laneOffset, y: 0, z: 0 },
          { x: bounds.maxX - 140, y: 0, z: bounds.maxZ - 140 }
        ]
      }
    ]
  };
}

async function runLocationResolver(request: WorldGenerationRequest): Promise<SessionLocationIdentity> {
  return request.location;
}

async function runGeoDataFetcher(
  identity: SessionLocationIdentity,
  source: GeoDataPresetSource
): Promise<GeoDataPreset> {
  return (await source.fetch(identity.reuseKey)) ?? createFallbackPreset(identity);
}

function runSliceBoundaryPlanner(preset: GeoDataPreset): SliceBounds {
  return preset.bounds;
}

function runRoadNormalizer(bounds: SliceBounds, preset: GeoDataPreset): SliceRoad[] {
  return preset.roads.map((road) => ({
    ...road,
    points: road.points.map((point) => clampRoadPoint(point, bounds))
  }));
}

function runPlayabilityPassPipeline(bounds: SliceBounds, roads: SliceRoad[]): SliceRoad[] {
  return roads.filter((road) => road.points.length >= 2).map((road) => ({
    ...road,
    points: road.points.map((point) => clampRoadPoint(point, bounds))
  }));
}

function roadTouchesChunk(road: SliceRoad, chunk: SliceChunk): boolean {
  return road.points.some(
    (point) =>
      point.x >= chunk.origin.x &&
      point.x <= chunk.origin.x + chunk.size.width &&
      point.z >= chunk.origin.z &&
      point.z <= chunk.origin.z + chunk.size.depth
  );
}

function createStarterVehicleSpawnPlan(): SpawnCandidate["starterVehicle"] {
  return {
    kind: "starter-car",
    placement: "lane-center",
    dimensions: {
      width: 2.2,
      height: 1.6,
      length: 4.6
    }
  };
}

function calculateHeadingDegrees(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
  return (Math.atan2(end.x - start.x, end.z - start.z) * 180) / Math.PI;
}

function calculateSegmentLength(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;

  return Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
}

function moveAlongRoad(
  start: SliceRoad["points"][number],
  end: SliceRoad["points"][number],
  distance: number
): SliceRoad["points"][number] {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

  if (length === 0) {
    return { ...start };
  }

  const ratio = Math.min(1, distance / length);

  return {
    x: start.x + deltaX * ratio,
    y: start.y + (end.y - start.y) * ratio,
    z: start.z + deltaZ * ratio
  };
}

function runChunkAssembler(bounds: SliceBounds, roads: SliceRoad[]): SliceChunk[] {
  const width = (bounds.maxX - bounds.minX) / 2;
  const depth = (bounds.maxZ - bounds.minZ) / 2;
  const chunks: SliceChunk[] = [];

  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const chunk: SliceChunk = {
        id: `chunk-${column}-${row}`,
        origin: {
          x: bounds.minX + column * width,
          y: 0,
          z: bounds.minZ + row * depth
        },
        size: {
          width,
          depth
        },
        roadIds: []
      };

      chunk.roadIds = roads.filter((road) => roadTouchesChunk(road, chunk)).map((road) => road.id);
      chunks.push(chunk);
    }
  }

  return chunks;
}

function runSpawnPlanner(chunks: SliceChunk[], roads: SliceRoad[]): SpawnCandidate[] {
  const primaryRoad = roads[0];
  const spawnChunk = chunks.find((chunk) => chunk.roadIds.includes(primaryRoad?.id ?? "")) ?? chunks[0];
  const primaryStart = primaryRoad?.points[0] ?? { x: 0, y: 0, z: 0 };
  const primaryEnd = primaryRoad?.points[1] ?? primaryStart;
  const starterVehicle = createStarterVehicleSpawnPlan();
  const segmentLength = calculateSegmentLength(primaryStart, primaryEnd);
  const desiredInsetDistance = primaryRoad
    ? Math.max(primaryRoad.width * 1.5, starterVehicle.dimensions.length * 4, 24)
    : 0;
  const spawnInsetDistance = Math.min(desiredInsetDistance, segmentLength / 2);
  const spawnPosition = moveAlongRoad(primaryStart, primaryEnd, spawnInsetDistance);

  return [
    {
      id: `spawn-${spawnChunk?.id ?? "0"}`,
      chunkId: spawnChunk?.id ?? chunks[0]?.id ?? "chunk-0-0",
      roadId: primaryRoad?.id ?? "road-0",
      position: spawnPosition,
      headingDegrees: calculateHeadingDegrees(primaryStart, primaryEnd),
      surface: "road",
      laneIndex: 0,
      starterVehicle
    }
  ];
}

function createSliceManifest(
  request: WorldGenerationRequest,
  preset: GeoDataPreset,
  bounds: SliceBounds,
  chunks: SliceChunk[],
  roads: SliceRoad[],
  spawnCandidates: SpawnCandidate[],
  generationVersion: string
): SliceManifest {
  return {
    sliceId: `${request.location.reuseKey}-${request.sliceSeed}`,
    generationVersion,
    location: {
      placeName: request.location.placeName,
      reuseKey: request.location.reuseKey,
      sessionKey: request.location.sessionKey
    },
    seed: request.sliceSeed,
    bounds,
    chunks,
    roads,
    spawnCandidates,
    sceneMetadata: {
      displayName: preset.displayName,
      districtName: preset.districtName,
      roadColor: "#f6d365",
      groundColor: "#263238",
      boundaryColor: "#8ec5fc"
    }
  };
}

async function runSliceManifestStore(store: SliceManifestStore, manifest: SliceManifest): Promise<void> {
  await store.save(manifest);
}

class EmptyGeoDataPresetSource implements GeoDataPresetSource {
  async fetch(): Promise<GeoDataPreset | null> {
    return null;
  }
}

export class FetchGeoDataPresetSource implements GeoDataPresetSource {
  private readonly url: string;

  private presetsPromise: Promise<Map<string, GeoDataPreset>> | null = null;

  constructor(url: string = "/data/world-gen/location-presets.json") {
    this.url = url;
  }

  async fetch(reuseKey: string): Promise<GeoDataPreset | null> {
    const presets = await this.loadPresets();

    return presets.get(reuseKey) ?? null;
  }

  private async loadPresets(): Promise<Map<string, GeoDataPreset>> {
    if (this.presetsPromise) {
      return this.presetsPromise;
    }

    this.presetsPromise = fetch(this.url)
      .then(async (response) => {
        if (!response.ok) {
          return new Map<string, GeoDataPreset>();
        }

        const records = (await response.json()) as StoredGeoDataPreset[];

        return new Map(records.map(({ reuseKey, ...preset }) => [reuseKey, preset]));
      })
      .catch(() => new Map<string, GeoDataPreset>());

    return this.presetsPromise;
  }
}

export class DefaultWorldSliceGenerator implements WorldSliceGenerator {
  private readonly geoDataPresetSource: GeoDataPresetSource;

  private readonly manifestStore: SliceManifestStore;

  private readonly generationVersion: string;

  constructor(options: DefaultWorldSliceGeneratorOptions = {}) {
    this.geoDataPresetSource = options.geoDataPresetSource ?? new FetchGeoDataPresetSource();
    this.manifestStore = options.manifestStore ?? new InMemorySliceManifestStore();
    this.generationVersion = options.generationVersion ?? "story-1-2";
  }

  async generate(request: WorldGenerationRequest): Promise<WorldSliceGenerationResult> {
    try {
      const identity = await runLocationResolver(request);
      const preset = await runGeoDataFetcher(identity, this.geoDataPresetSource);
      const bounds = runSliceBoundaryPlanner(preset);
      const roads = applyRoadDisplayNames(runPlayabilityPassPipeline(bounds, runRoadNormalizer(bounds, preset)));
      const chunks = runChunkAssembler(bounds, roads);
      const spawnCandidates = runSpawnPlanner(chunks, roads);
      const manifest = createSliceManifest(
        request,
        preset,
        bounds,
        chunks,
        roads,
        spawnCandidates,
        this.generationVersion
      );

      await runSliceManifestStore(this.manifestStore, manifest);

      return {
        ok: true,
        manifest,
        spawnCandidate: spawnCandidates[0] ?? {
          id: "spawn-chunk-0-0",
          chunkId: chunks[0]?.id ?? "chunk-0-0",
          roadId: roads[0]?.id ?? "road-0",
          position: { x: 0, y: 0, z: 0 },
          headingDegrees: 90,
          surface: "road",
          laneIndex: 0,
          starterVehicle: createStarterVehicleSpawnPlan()
        }
      };
    } catch (error) {
      return createWorldLoadFailure(
        "WORLD_GENERATION_FAILED",
        "world-generating",
        "The slice could not be generated. Retry or edit the location.",
        request.location.placeName,
        {
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  getStoredManifest(sliceId: string): SliceManifest | null {
    return this.manifestStore.getBySliceId(sliceId);
  }

  getStoredManifestByReuseKey(reuseKey: string): SliceManifest | null {
    return this.manifestStore.getByReuseKey(reuseKey);
  }
}
