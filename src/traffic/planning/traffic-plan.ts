import { collectRoadPlacementCandidates, selectSpacedRoadPlacements } from "../../world/chunks/road-placement";
import type {
  SliceBounds,
  SliceChunk,
  SliceRoad,
  SliceTrafficPlan,
  SpawnCandidate,
  TrafficVehicleDirection,
  TrafficVehiclePlan,
  TrafficVehicleType
} from "../../world/chunks/slice-manifest";

export interface CreateTrafficPlanOptions {
  bounds: SliceBounds;
  chunks: SliceChunk[];
  roads: SliceRoad[];
  spawnCandidate: SpawnCandidate;
}

const HIJACKABLE_SLOT_RATIOS = [0.2, 0.5, 0.8] as const;
const TRAFFIC_SLOT_RATIOS = [0.35, 0.65] as const;
const ROAD_BOUNDS_PADDING = 10;
const MIN_TRAFFIC_SEGMENT_LENGTH = 72;
const MIN_TRAFFIC_CLEARANCE = 36;
const MIN_TRAFFIC_SPACING = 24;
const MIN_HIJACKABLE_SEGMENT_LENGTH = 40;
const MIN_HIJACKABLE_CLEARANCE = 24;
const MIN_HIJACKABLE_SPACING = 18;

export const TRAFFIC_VEHICLE_TYPES: readonly TrafficVehicleType[] = ["sedan", "sports-car", "heavy-truck"];

function createTrafficDirection(index: number): TrafficVehicleDirection {
  return index % 2 === 0 ? "forward" : "reverse";
}

function createTrafficHeadingDegrees(baseHeadingDegrees: number, direction: TrafficVehicleDirection): number {
  return direction === "forward" ? baseHeadingDegrees : baseHeadingDegrees + 180;
}

function createTrafficSpeedScale(index: number): number {
  const speedScales = [0.5, 0.62, 0.56, 0.68] as const;

  return speedScales[index % speedScales.length];
}

export function createTrafficPlan(options: CreateTrafficPlanOptions): SliceTrafficPlan {
  const { bounds, chunks, roads, spawnCandidate } = options;
  const reservedSecondaryPlacements = selectSpacedRoadPlacements({
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
    limit: TRAFFIC_VEHICLE_TYPES.length,
    minimumSpacing: MIN_HIJACKABLE_SPACING
  });
  const trafficCandidates = selectSpacedRoadPlacements({
    candidates: collectRoadPlacementCandidates({
      bounds,
      boundsPadding: ROAD_BOUNDS_PADDING,
      chunks,
      deprioritizedRoadId: spawnCandidate.roadId,
      fallbackChunkId: spawnCandidate.chunkId,
      minimumSegmentLength: MIN_TRAFFIC_SEGMENT_LENGTH,
      minimumStarterClearance: MIN_TRAFFIC_CLEARANCE,
      roads,
      slotRatios: TRAFFIC_SLOT_RATIOS,
      starterPosition: spawnCandidate.position
    }),
    limit: Math.min(4, Math.max(2, roads.length)),
    minimumSpacing: MIN_TRAFFIC_SPACING,
    reservedPositions: reservedSecondaryPlacements.map((candidate) => candidate.position)
  });
  const vehicles: TrafficVehiclePlan[] = trafficCandidates.map((candidate, index) => {
    const direction = createTrafficDirection(index);

    return {
      chunkId: candidate.chunkId,
      direction,
      headingDegrees: createTrafficHeadingDegrees(candidate.headingDegrees, direction),
      id: `${candidate.roadId}-traffic-${candidate.segmentIndex}-${candidate.slotIndex}`,
      position: candidate.position,
      roadId: candidate.roadId,
      speedScale: createTrafficSpeedScale(index),
      startDistance: candidate.distanceAlongRoad,
      vehicleType: TRAFFIC_VEHICLE_TYPES[index % TRAFFIC_VEHICLE_TYPES.length]
    };
  });

  return { vehicles };
}
