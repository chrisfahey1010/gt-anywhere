import type {
  SliceBreakablePropPlan,
  SliceBounds,
  SliceChunk,
  SliceDistrict,
  SliceManifest,
  SlicePedestrianPlan,
  SliceRoad,
  SliceTrafficPlan,
  SliceVector3,
  SliceWorldEntry,
  SpawnCandidate
} from "../chunks/slice-manifest";
import { DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES } from "../chunks/scene-visual-palette";
import type { WorldSize } from "../../app/config/settings-schema";
import { createPedestrianPlan } from "../../pedestrians/planning/pedestrian-plan";
import { createTrafficPlan } from "../../traffic/planning/traffic-plan";
import { createBreakablePropPlan } from "../planning/breakable-prop-plan";
import type { SessionLocationIdentity, WorldGenerationRequest } from "./location-resolver";
import { InMemorySliceManifestStore, type SliceManifestStore } from "./slice-manifest-store";
import { createWorldLoadFailure, type WorldLoadFailure } from "./world-load-failure";
import { applyRoadDisplayNames } from "./road-display-name";
import { resolveLocationPresetPath } from "../../app/config/runtime-paths";

interface StoredGeoDataPreset extends GeoDataPreset {
  reuseKey: string;
}

const WORLD_SIZE_SCALE: Record<WorldSize, number> = {
  small: 0.75,
  medium: 1,
  large: 1.25
};

export interface GeoDataPreset {
  presetId: string;
  displayName: string;
  districtName: string;
  bounds: SliceBounds;
  districts: SliceDistrict[];
  roads: SliceRoad[];
  worldEntries: GeoDataPresetWorldEntry[];
}

export interface GeoDataPresetWorldEntry {
  id: string;
  districtId: string;
  kind: SliceWorldEntry["kind"];
  assetId?: string;
  position: SliceVector3;
  dimensions: SliceWorldEntry["dimensions"];
  yawDegrees?: number;
  metadata: SliceWorldEntry["metadata"];
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

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampBoundsToSlice(bounds: SliceBounds, sliceBounds: SliceBounds): SliceBounds {
  const minX = clampValue(bounds.minX, sliceBounds.minX, sliceBounds.maxX);
  const maxX = clampValue(bounds.maxX, sliceBounds.minX, sliceBounds.maxX);
  const minZ = clampValue(bounds.minZ, sliceBounds.minZ, sliceBounds.maxZ);
  const maxZ = clampValue(bounds.maxZ, sliceBounds.minZ, sliceBounds.maxZ);

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ)
  };
}

function createStableIdFragment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "slice";
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
    districts: [],
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
    ],
    worldEntries: []
  };
}

async function runLocationResolver(request: WorldGenerationRequest): Promise<SessionLocationIdentity> {
  return request.location;
}

async function runGeoDataFetcher(
  request: WorldGenerationRequest,
  source: GeoDataPresetSource
): Promise<GeoDataPreset> {
  const preset = (await source.fetch(request.location.reuseKey)) ?? createFallbackPreset(request.location);

  return scalePresetForWorldSize(preset, request.generationSettings.worldSize);
}

function runSliceBoundaryPlanner(preset: GeoDataPreset): SliceBounds {
  return preset.bounds;
}

function scaleBounds(bounds: SliceBounds, scale: number): SliceBounds {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfWidth = ((bounds.maxX - bounds.minX) / 2) * scale;
  const halfDepth = ((bounds.maxZ - bounds.minZ) / 2) * scale;

  return {
    minX: centerX - halfWidth,
    maxX: centerX + halfWidth,
    minZ: centerZ - halfDepth,
    maxZ: centerZ + halfDepth
  };
}

function scalePointAroundBoundsCenter(point: SliceRoad["points"][number], bounds: SliceBounds, scale: number): SliceRoad["points"][number] {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return {
    x: centerX + (point.x - centerX) * scale,
    y: point.y,
    z: centerZ + (point.z - centerZ) * scale
  };
}

function scaleVectorAroundBoundsCenter(point: SliceVector3, bounds: SliceBounds, scale: number): SliceVector3 {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return {
    x: centerX + (point.x - centerX) * scale,
    y: point.y * scale,
    z: centerZ + (point.z - centerZ) * scale
  };
}

function scalePresetForWorldSize(preset: GeoDataPreset, worldSize: WorldSize): GeoDataPreset {
  const scale = WORLD_SIZE_SCALE[worldSize];

  if (scale === 1) {
    return preset;
  }

  return {
    ...preset,
    bounds: scaleBounds(preset.bounds, scale),
    districts: preset.districts.map((district) => ({
      ...district,
      bounds: scaleBounds(district.bounds, scale)
    })),
    roads: preset.roads.map((road) => ({
      ...road,
      points: road.points.map((point) => scalePointAroundBoundsCenter(point, preset.bounds, scale))
    })),
    worldEntries: preset.worldEntries.map((entry) => ({
      ...entry,
      position: scaleVectorAroundBoundsCenter(entry.position, preset.bounds, scale),
      dimensions: {
        width: entry.dimensions.width * scale,
        height: entry.dimensions.height * scale,
        depth: entry.dimensions.depth * scale
      }
    }))
  };
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

function createDerivedDistrict(preset: GeoDataPreset, bounds: SliceBounds, roads: SliceRoad[]): SliceDistrict {
  return {
    id: `${createStableIdFragment(preset.presetId)}-district-0`,
    displayName: preset.districtName,
    bounds,
    anchorRoadIds: roads.slice(0, 2).map((road) => road.id)
  };
}

function runDistrictPlanner(bounds: SliceBounds, preset: GeoDataPreset, roads: SliceRoad[]): SliceDistrict[] {
  const knownRoadIds = new Set(roads.map((road) => road.id));
  const normalizedDistricts = preset.districts
    .map((district) => ({
      ...district,
      bounds: clampBoundsToSlice(district.bounds, bounds),
      anchorRoadIds: district.anchorRoadIds.filter((roadId) => knownRoadIds.has(roadId))
    }))
    .map((district, index) => ({
      ...district,
      anchorRoadIds:
        district.anchorRoadIds.length > 0
          ? district.anchorRoadIds
          : roads.slice(index, index + 2).map((road) => road.id).filter((roadId) => typeof roadId === "string")
    }))
    .filter((district) => district.displayName.length > 0);

  return normalizedDistricts.length > 0 ? normalizedDistricts : [createDerivedDistrict(preset, bounds, roads)];
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

function pointFallsInsideChunk(point: SliceVector3, chunk: SliceChunk): boolean {
  return (
    point.x >= chunk.origin.x &&
    point.x <= chunk.origin.x + chunk.size.width &&
    point.z >= chunk.origin.z &&
    point.z <= chunk.origin.z + chunk.size.depth
  );
}

function createWorldEntryFootprintBounds(
  position: SliceVector3,
  dimensions: SliceWorldEntry["dimensions"]
): SliceBounds {
  return {
    minX: position.x - dimensions.width / 2,
    maxX: position.x + dimensions.width / 2,
    minZ: position.z - dimensions.depth / 2,
    maxZ: position.z + dimensions.depth / 2
  };
}

function chunkIntersectsBounds(chunk: SliceChunk, bounds: SliceBounds): boolean {
  return !(
    bounds.maxX < chunk.origin.x ||
    bounds.minX > chunk.origin.x + chunk.size.width ||
    bounds.maxZ < chunk.origin.z ||
    bounds.minZ > chunk.origin.z + chunk.size.depth
  );
}

function clampWorldEntryPosition(
  position: SliceVector3,
  dimensions: SliceWorldEntry["dimensions"],
  bounds: SliceBounds
): SliceVector3 {
  return {
    x: clampValue(position.x, bounds.minX + dimensions.width / 2, bounds.maxX - dimensions.width / 2),
    y: position.y,
    z: clampValue(position.z, bounds.minZ + dimensions.depth / 2, bounds.maxZ - dimensions.depth / 2)
  };
}

function resolveWorldEntryChunkOwnership(
  chunks: SliceChunk[],
  position: SliceVector3,
  dimensions: SliceWorldEntry["dimensions"]
): { chunkId: string; relatedChunkIds?: string[] } {
  const footprintBounds = createWorldEntryFootprintBounds(position, dimensions);
  const ownerChunk =
    chunks.find((chunk) => pointFallsInsideChunk(position, chunk)) ??
    chunks.find((chunk) => chunkIntersectsBounds(chunk, footprintBounds)) ??
    chunks[0];
  const relatedChunkIds = ownerChunk
    ? chunks
        .filter((chunk) => chunk.id !== ownerChunk.id && chunkIntersectsBounds(chunk, footprintBounds))
        .map((chunk) => chunk.id)
    : [];

  return {
    chunkId: ownerChunk?.id ?? "chunk-0-0",
    relatedChunkIds: relatedChunkIds.length > 0 ? relatedChunkIds : undefined
  };
}

function resolveDistrictIdForPosition(position: SliceVector3, districts: SliceDistrict[]): string {
  return (
    districts.find(
      (district) =>
        position.x >= district.bounds.minX &&
        position.x <= district.bounds.maxX &&
        position.z >= district.bounds.minZ &&
        position.z <= district.bounds.maxZ
    )?.id ?? districts[0]?.id ?? "fallback-district"
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

function runWorldEntryPlanner(options: {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  districts: SliceDistrict[];
  preset: GeoDataPreset;
  spawnChunkId: string;
}): SliceWorldEntry[] {
  const { bounds, chunks, districts, preset, spawnChunkId } = options;
  const districtIds = new Set(districts.map((district) => district.id));
  const fallbackDistrictId = districts[0]?.id ?? `${createStableIdFragment(preset.presetId)}-district-0`;
  const normalizedEntries = preset.worldEntries.map((entry) => {
    const position = clampWorldEntryPosition(entry.position, entry.dimensions, bounds);
    const ownership = resolveWorldEntryChunkOwnership(chunks, position, entry.dimensions);

    return {
      ...entry,
      chunkId: ownership.chunkId,
      districtId: districtIds.has(entry.districtId) ? entry.districtId : fallbackDistrictId,
      position,
      relatedChunkIds: ownership.relatedChunkIds
    } satisfies SliceWorldEntry;
  });

  const coveredChunkIds = new Set(normalizedEntries.map((entry) => entry.chunkId));
  const derivedEntries: SliceWorldEntry[] = chunks
    .filter((chunk) => chunk.id !== spawnChunkId && chunk.roadIds.length > 0)
    .filter((chunk) => !coveredChunkIds.has(chunk.id))
    .map(
      (chunk, index) =>
        ({
          id: `${chunk.id}-world-entry-0`,
          chunkId: chunk.id,
          districtId: resolveDistrictIdForPosition(
            {
              x: chunk.origin.x + chunk.size.width / 2,
              y: 0,
              z: chunk.origin.z + chunk.size.depth / 2
            },
            districts
          ),
          kind: "building-massing",
          assetId: `building-${index % 3}`,
          position: {
            x: chunk.origin.x + chunk.size.width / 2,
            y: 0,
            z: chunk.origin.z + chunk.size.depth / 2
          },
          dimensions: {
            width: Math.max(26, chunk.size.width * 0.18),
            height: 28 + index * 8,
            depth: Math.max(22, chunk.size.depth * 0.18)
          },
          metadata: {
            displayName: `${preset.districtName} Block ${index + 1}`,
            source: "derived"
          }
        }) satisfies SliceWorldEntry
    );

  if (normalizedEntries.length === 0) {
    return derivedEntries.map((entry): SliceWorldEntry => ({
      ...entry,
      districtId: entry.districtId || fallbackDistrictId
    }));
  }

  return [...normalizedEntries, ...derivedEntries];
}

function createFallbackSpawnCandidate(chunks: SliceChunk[], roads: SliceRoad[]): SpawnCandidate {
  return {
    id: "spawn-chunk-0-0",
    chunkId: chunks[0]?.id ?? "chunk-0-0",
    roadId: roads[0]?.id ?? "road-0",
    position: { x: 0, y: 0, z: 0 },
    headingDegrees: 90,
    surface: "road",
    laneIndex: 0,
    starterVehicle: createStarterVehicleSpawnPlan()
  };
}

function createSliceManifest(
  request: WorldGenerationRequest,
  preset: GeoDataPreset,
  bounds: SliceBounds,
  chunks: SliceChunk[],
  roads: SliceRoad[],
  districts: SliceDistrict[],
  worldEntries: SliceWorldEntry[],
  spawnCandidates: SpawnCandidate[],
  traffic: SliceTrafficPlan,
  pedestrians: SlicePedestrianPlan,
  breakableProps: SliceBreakablePropPlan,
  generationVersion: string
): SliceManifest {
  return {
    sliceId: request.compatibilityKey,
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
    districts,
    worldEntries,
    spawnCandidates,
    traffic,
    pedestrians,
    breakableProps,
    sceneMetadata: {
      displayName: preset.displayName,
      districtName: preset.districtName || districts[0]?.displayName || preset.displayName,
      roadColor: "#f6d365",
      groundColor: "#263238",
      boundaryColor: "#8ec5fc",
      palette: {
        ...DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES,
        propColors: {
          ...(DEFAULT_SCENE_VISUAL_PALETTE_OVERRIDES.propColors ?? {})
        }
      }
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

  constructor(url: string = resolveLocationPresetPath()) {
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

    const promise = fetch(this.url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch presets");
        }

        const records = (await response.json()) as StoredGeoDataPreset[];

        return new Map(records.map(({ reuseKey, ...preset }) => [reuseKey, preset]));
      })
      .catch(() => {
        if (this.presetsPromise === promise) {
          this.presetsPromise = null;
        }
        
        return new Map<string, GeoDataPreset>();
      });

    this.presetsPromise = promise;

    return promise;
  }
}

export class DefaultWorldSliceGenerator implements WorldSliceGenerator {
  private readonly geoDataPresetSource: GeoDataPresetSource;

  private readonly manifestStore: SliceManifestStore;

  private readonly generationVersion: string;

  constructor(options: DefaultWorldSliceGeneratorOptions = {}) {
    this.geoDataPresetSource = options.geoDataPresetSource ?? new FetchGeoDataPresetSource();
    this.manifestStore = options.manifestStore ?? new InMemorySliceManifestStore();
    this.generationVersion = options.generationVersion ?? "story-5-2";
  }

  async generate(request: WorldGenerationRequest): Promise<WorldSliceGenerationResult> {
    try {
      const storedManifest = this.manifestStore.getBySliceId(request.compatibilityKey);

      if (storedManifest && storedManifest.generationVersion === this.generationVersion) {
        return {
          ok: true,
          manifest: storedManifest,
          spawnCandidate:
            storedManifest.spawnCandidates[0] ?? createFallbackSpawnCandidate(storedManifest.chunks, storedManifest.roads)
        };
      }

      await runLocationResolver(request);
      const preset = await runGeoDataFetcher(request, this.geoDataPresetSource);
      const bounds = runSliceBoundaryPlanner(preset);
      const roads = applyRoadDisplayNames(runPlayabilityPassPipeline(bounds, runRoadNormalizer(bounds, preset)));
      const districts = runDistrictPlanner(bounds, preset, roads);
      const chunks = runChunkAssembler(bounds, roads);
      const spawnCandidates = runSpawnPlanner(chunks, roads);
      const primarySpawnCandidate = spawnCandidates[0] ?? createFallbackSpawnCandidate(chunks, roads);
      const worldEntries = runWorldEntryPlanner({
        bounds,
        chunks,
        districts,
        preset,
        spawnChunkId: primarySpawnCandidate.chunkId
      });
      const traffic = createTrafficPlan({
        bounds,
        chunks,
        density: request.generationSettings.trafficDensity,
        roads,
        spawnCandidate: primarySpawnCandidate
      });
      const pedestrians = createPedestrianPlan({
        bounds,
        chunks,
        density: request.generationSettings.pedestrianDensity,
        roads,
        spawnCandidate: primarySpawnCandidate,
        traffic
      });
      const breakableProps = createBreakablePropPlan({
        bounds,
        chunks,
        pedestrianDensity: request.generationSettings.pedestrianDensity,
        roads,
        spawnCandidate: primarySpawnCandidate,
        trafficDensity: request.generationSettings.trafficDensity,
        traffic,
        pedestrians
      });
      const manifest = createSliceManifest(
        request,
        preset,
        bounds,
        chunks,
        roads,
        districts,
        worldEntries,
        spawnCandidates,
        traffic,
        pedestrians,
        breakableProps,
        this.generationVersion
      );

      await runSliceManifestStore(this.manifestStore, manifest);

      return {
        ok: true,
        manifest,
        spawnCandidate: primarySpawnCandidate
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
