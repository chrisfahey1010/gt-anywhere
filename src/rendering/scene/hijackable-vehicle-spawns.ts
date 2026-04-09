import type {
  SliceManifest,
  SliceVector3,
  SpawnCandidate
} from "../../world/chunks/slice-manifest";
import {
  collectRoadPlacementCandidates,
  selectSpacedRoadPlacements,
  type RoadPlacementCandidate
} from "../../world/chunks/road-placement";

export const HIJACKABLE_VEHICLE_TYPES = ["sports-car", "heavy-truck", "sedan"] as const;

export interface HijackableVehicleSpawn {
  chunkId: string;
  headingDegrees: number;
  id: string;
  position: SliceVector3;
  roadId: string;
  vehicleType: (typeof HIJACKABLE_VEHICLE_TYPES)[number];
}

const BOUNDS_PADDING = 10;
const MIN_SEGMENT_LENGTH = 40;
const MIN_STARTER_CLEARANCE = 24;
const MIN_SECONDARY_SPACING = 18;
const ROAD_SLOT_RATIOS = [0.2, 0.5, 0.8] as const;

function collectCandidateSpawns(manifest: SliceManifest, spawnCandidate: SpawnCandidate): RoadPlacementCandidate[] {
  return collectRoadPlacementCandidates({
    bounds: manifest.bounds,
    boundsPadding: BOUNDS_PADDING,
    chunks: manifest.chunks,
    deprioritizedRoadId: spawnCandidate.roadId,
    fallbackChunkId: spawnCandidate.chunkId,
    minimumSegmentLength: MIN_SEGMENT_LENGTH,
    minimumStarterClearance: MIN_STARTER_CLEARANCE,
    roads: manifest.roads,
    slotRatios: ROAD_SLOT_RATIOS,
    starterPosition: spawnCandidate.position
  });
}

export function createHijackableVehicleSpawns(
  manifest: SliceManifest,
  spawnCandidate: SpawnCandidate
): HijackableVehicleSpawn[] {
  const selected = selectSpacedRoadPlacements({
    candidates: collectCandidateSpawns(manifest, spawnCandidate),
    limit: HIJACKABLE_VEHICLE_TYPES.length,
    minimumSpacing: MIN_SECONDARY_SPACING
  });

  return selected.map((candidate, index) => ({
    chunkId: candidate.chunkId,
    headingDegrees: candidate.headingDegrees,
    id: `${candidate.roadId}-secondary-${candidate.segmentIndex}-${candidate.slotIndex}`,
    position: candidate.position,
    roadId: candidate.roadId,
    vehicleType: HIJACKABLE_VEHICLE_TYPES[index]
  }));
}
