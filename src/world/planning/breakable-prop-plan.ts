import {
  collectRoadPlacementCandidates,
  selectSpacedRoadPlacements,
  type RoadPlacementCandidate
} from "../chunks/road-placement";
import type { PedestrianDensity, TrafficDensity } from "../../app/config/settings-schema";
import type {
  BreakablePropPlanEntry,
  BreakablePropType,
  SliceBounds,
  SliceBreakablePropPlan,
  SliceChunk,
  SlicePedestrianPlan,
  SliceRoad,
  SliceTrafficPlan,
  SliceVector3,
  SpawnCandidate
} from "../chunks/slice-manifest";

export interface CreateBreakablePropPlanOptions {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  pedestrianDensity: PedestrianDensity;
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
  trafficDensity: TrafficDensity;
  traffic: SliceTrafficPlan;
  pedestrians: SlicePedestrianPlan;
}

type BreakablePropCandidate = RoadPlacementCandidate;

const HIJACKABLE_SLOT_RATIOS = [0.2, 0.5, 0.8] as const;
const BREAKABLE_PROP_SLOT_RATIOS_BY_DENSITY = {
  low: [0.45],
  medium: [0.15, 0.45, 0.75],
  high: [0.1, 0.3, 0.55, 0.8]
} as const;
const BREAKABLE_PROP_TYPES: readonly BreakablePropType[] = ["signpost", "bollard", "barrier", "hydrant", "short-post"];
const BOUNDS_PADDING = 14;
const ROAD_BOUNDS_PADDING = 10;
const MIN_HIJACKABLE_SEGMENT_LENGTH = 40;
const MIN_HIJACKABLE_CLEARANCE = 24;
const MIN_HIJACKABLE_SPACING = 18;
const MIN_PROP_SEGMENT_LENGTH = 52;
const MIN_PROP_STARTER_CLEARANCE = 34;
const MIN_PROP_SPACING = 20;
const MAX_BREAKABLE_PROP_COUNT = 8;
const ROADSIDE_OFFSET = 4;
const ROADSIDE_OFFSET_VARIATION = 0.75;

type AmbientDensity = keyof typeof BREAKABLE_PROP_SLOT_RATIOS_BY_DENSITY;

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
  density: AmbientDensity;
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
}): BreakablePropCandidate[] {
  const { bounds, chunks, density, roads, spawnCandidate } = options;
  const roadsById = new Map(roads.map((road) => [road.id, road]));

  return collectRoadPlacementCandidates({
    bounds,
    boundsPadding: ROAD_BOUNDS_PADDING,
    chunks,
    deprioritizedRoadId: spawnCandidate.roadId,
    fallbackChunkId: spawnCandidate.chunkId,
    minimumSegmentLength: MIN_PROP_SEGMENT_LENGTH,
    minimumStarterClearance: MIN_PROP_STARTER_CLEARANCE,
    roads,
    slotRatios: BREAKABLE_PROP_SLOT_RATIOS_BY_DENSITY[density],
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
        chunkId: candidate.chunkId,
        distanceAlongRoad: candidate.distanceAlongRoad,
        headingDegrees: candidate.headingDegrees,
        position,
        roadId: candidate.roadId,
        segmentIndex: candidate.segmentIndex,
        slotIndex: candidate.slotIndex
      }
    ];
  });
}

function resolveAmbientDensity(trafficDensity: TrafficDensity, pedestrianDensity: PedestrianDensity): AmbientDensity {
  if (trafficDensity === "high" || pedestrianDensity === "high") {
    return "high";
  }

  if (trafficDensity === "low" && (pedestrianDensity === "off" || pedestrianDensity === "low")) {
    return "low";
  }

  return "medium";
}

function resolveBreakablePropLimit(density: AmbientDensity, roadCount: number): number {
  switch (density) {
    case "low":
      return Math.max(2, roadCount);

    case "high":
      return Math.min(12, Math.max(6, roadCount * 3));

    case "medium":
    default:
      return Math.min(MAX_BREAKABLE_PROP_COUNT, Math.max(4, roadCount * 2));
  }
}

export function createBreakablePropPlan(options: CreateBreakablePropPlanOptions): SliceBreakablePropPlan {
  const { bounds, chunks, pedestrianDensity, pedestrians, roads, spawnCandidate, traffic, trafficDensity } = options;
  const density = resolveAmbientDensity(trafficDensity, pedestrianDensity);
  const roadsideCandidates = createRoadsideCandidates({ bounds, chunks, density, roads, spawnCandidate });
  const selectedCandidates = selectSpacedRoadPlacements({
    candidates: roadsideCandidates,
    limit: resolveBreakablePropLimit(density, roads.length),
    minimumSpacing: MIN_PROP_SPACING,
    reservedPositions: [
      spawnCandidate.position,
      ...traffic.vehicles.map((vehicle) => vehicle.position),
      ...pedestrians.pedestrians.map((pedestrian) => pedestrian.position),
      ...collectReservedHijackablePositions({ bounds, chunks, roads, spawnCandidate })
    ]
  });

  const props: BreakablePropPlanEntry[] = selectedCandidates.map((candidate, index) => {
    const propType = BREAKABLE_PROP_TYPES[index % BREAKABLE_PROP_TYPES.length] ?? "bollard";

    return {
      chunkId: candidate.chunkId,
      headingDegrees: candidate.headingDegrees,
      id: `${candidate.roadId}-${propType}-${candidate.segmentIndex}-${candidate.slotIndex}`,
      position: candidate.position,
      propType,
      roadId: candidate.roadId,
      startDistance: candidate.distanceAlongRoad
    };
  });

  return { props };
}
