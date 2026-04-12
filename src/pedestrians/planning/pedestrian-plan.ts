import { collectRoadPlacementCandidates, selectSpacedRoadPlacements } from "../../world/chunks/road-placement";
import type { PedestrianDensity } from "../../app/config/settings-schema";
import type {
  PedestrianInitialState,
  SliceBounds,
  SliceChunk,
  SlicePedestrianPlan,
  SliceRoad,
  SliceTrafficPlan,
  SliceVector3,
  SpawnCandidate
} from "../../world/chunks/slice-manifest";

export interface CreatePedestrianPlanOptions {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  density: PedestrianDensity;
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
  traffic: SliceTrafficPlan;
}

interface PedestrianPlacementCandidate {
  chunkId: string;
  distanceAlongRoad: number;
  headingDegrees: number;
  offsetFromRoad: number;
  position: SliceVector3;
  roadId: string;
  segmentIndex: number;
  slotIndex: number;
  sortBucket: number;
}

const HIJACKABLE_SLOT_RATIOS = [0.2, 0.5, 0.8] as const;
const PEDESTRIAN_SLOT_RATIOS_BY_DENSITY = {
  off: [],
  low: [0.5],
  medium: [0.2, 0.5, 0.8],
  high: [0.15, 0.35, 0.6, 0.85]
} as const;
const BOUNDS_PADDING = 12;
const ROAD_BOUNDS_PADDING = 10;
const MIN_HIJACKABLE_SEGMENT_LENGTH = 40;
const MIN_HIJACKABLE_CLEARANCE = 24;
const MIN_HIJACKABLE_SPACING = 18;
const MIN_PEDESTRIAN_SEGMENT_LENGTH = 48;
const MIN_PEDESTRIAN_CLEARANCE = 30;
const MIN_PEDESTRIAN_SPACING = 18;
const MAX_PEDESTRIAN_COUNT = 6;
const ROADSIDE_OFFSET = 5;
const ROADSIDE_OFFSET_VARIATION = 0.75;
const INITIAL_STATE_ORDER: readonly PedestrianInitialState[] = ["walking", "standing", "waiting"];

function isWithinBounds(position: SliceVector3, bounds: SliceBounds, padding: number): boolean {
  return (
    position.x >= bounds.minX + padding &&
    position.x <= bounds.maxX - padding &&
    position.z >= bounds.minZ + padding &&
    position.z <= bounds.maxZ - padding
  );
}

function createRoadsidePosition(position: SliceVector3, headingDegrees: number, offsetFromRoad: number): SliceVector3 {
  const headingRadians = (headingDegrees * Math.PI) / 180;

  return {
    x: position.x + Math.cos(headingRadians) * offsetFromRoad,
    y: position.y,
    z: position.z - Math.sin(headingRadians) * offsetFromRoad
  };
}

function createPedestrianCandidateKey(candidate: {
  roadId: string;
  segmentIndex: number;
  slotIndex: number;
}): string {
  return `${candidate.roadId}:${candidate.segmentIndex}:${candidate.slotIndex}`;
}

function resolvePedestrianLimit(density: PedestrianDensity, roadCount: number): number {
  switch (density) {
    case "off":
      return 0;

    case "low":
      return Math.max(1, roadCount);

    case "high":
      return Math.min(10, Math.max(5, roadCount * 3));

    case "medium":
    default:
      return Math.min(MAX_PEDESTRIAN_COUNT, Math.max(3, roadCount * 2));
  }
}

function collectReservedHijackablePositions(options: {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
}): SliceVector3[] {
  const { bounds, chunks, roads, spawnCandidate } = options;
  const selected = selectSpacedRoadPlacements({
    candidates: collectRoadPlacementCandidates({
      bounds,
      boundsPadding: ROAD_BOUNDS_PADDING,
      chunks,
      deprioritizedRoadId: spawnCandidate.roadId,
      fallbackChunkId: spawnCandidate.chunkId,
      minimumSegmentLength: MIN_HIJACKABLE_SEGMENT_LENGTH,
      minimumStarterClearance: MIN_HIJACKABLE_CLEARANCE,
      roads,
      slotRatios: HIJACKABLE_SLOT_RATIOS,
      starterPosition: spawnCandidate.position
    }),
    limit: 3,
    minimumSpacing: MIN_HIJACKABLE_SPACING
  });

  return selected.map((candidate) => candidate.position);
}

function createRoadsideCandidates(options: {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  density: PedestrianDensity;
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
}): PedestrianPlacementCandidate[] {
  const { bounds, chunks, density, roads, spawnCandidate } = options;
  const roadsById = new Map(roads.map((road) => [road.id, road]));

  if (density === "off") {
    return [];
  }

  return collectRoadPlacementCandidates({
    bounds,
    boundsPadding: ROAD_BOUNDS_PADDING,
    chunks,
    deprioritizedRoadId: spawnCandidate.roadId,
    fallbackChunkId: spawnCandidate.chunkId,
    minimumSegmentLength: MIN_PEDESTRIAN_SEGMENT_LENGTH,
    minimumStarterClearance: MIN_PEDESTRIAN_CLEARANCE,
    roads,
    slotRatios: PEDESTRIAN_SLOT_RATIOS_BY_DENSITY[density],
    starterPosition: spawnCandidate.position
  }).flatMap((candidate) => {
    const road = roadsById.get(candidate.roadId);

    if (!road) {
      return [];
    }

    const side = (candidate.segmentIndex + candidate.slotIndex + candidate.roadId.length) % 2 === 0 ? 1 : -1;
    const offsetFromRoad = side * (road.width / 2 + ROADSIDE_OFFSET + (candidate.slotIndex % 2) * ROADSIDE_OFFSET_VARIATION);
    const position = createRoadsidePosition(candidate.position, candidate.headingDegrees, offsetFromRoad);

    if (!isWithinBounds(position, bounds, BOUNDS_PADDING)) {
      return [];
    }

    return [
      {
        ...candidate,
        offsetFromRoad,
        position
      }
    ];
  });
}

export function createPedestrianPlan(options: CreatePedestrianPlanOptions): SlicePedestrianPlan {
  const { bounds, chunks, density, roads, spawnCandidate, traffic } = options;
  const candidateMap = new Map<string, PedestrianPlacementCandidate>();
  const roadsideCandidates = createRoadsideCandidates({ bounds, chunks, density, roads, spawnCandidate });

  roadsideCandidates.forEach((candidate) => {
    candidateMap.set(createPedestrianCandidateKey(candidate), candidate);
  });

  const selectedCandidates = selectSpacedRoadPlacements({
    candidates: roadsideCandidates,
    limit: resolvePedestrianLimit(density, roads.length),
    minimumSpacing: MIN_PEDESTRIAN_SPACING,
    reservedPositions: [
      spawnCandidate.position,
      ...traffic.vehicles.map((vehicle) => vehicle.position),
      ...collectReservedHijackablePositions({ bounds, chunks, roads, spawnCandidate })
    ]
  });

  return {
    pedestrians: selectedCandidates.map((candidate, index) => {
      const preservedCandidate = candidateMap.get(createPedestrianCandidateKey(candidate));
      const initialState = INITIAL_STATE_ORDER[index % INITIAL_STATE_ORDER.length] ?? "standing";
      const headingDegrees = initialState === "walking" && index % 2 === 1 ? candidate.headingDegrees + 180 : candidate.headingDegrees;

      return {
        chunkId: candidate.chunkId,
        headingDegrees,
        id: `${candidate.roadId}-pedestrian-${candidate.segmentIndex}-${candidate.slotIndex}`,
        initialState,
        offsetFromRoad: preservedCandidate?.offsetFromRoad ?? 0,
        position: candidate.position,
        roadId: candidate.roadId,
        startDistance: candidate.distanceAlongRoad
      };
    })
  };
}
