import type {
  SliceBounds,
  SliceChunk,
  SliceManifest,
  SliceRoad,
  SliceVector3,
  SpawnCandidate
} from "../../world/chunks/slice-manifest";

export const HIJACKABLE_VEHICLE_TYPES = ["sports-car", "heavy-truck", "sedan"] as const;

export interface HijackableVehicleSpawn {
  chunkId: string;
  headingDegrees: number;
  id: string;
  position: SliceVector3;
  roadId: string;
  vehicleType: (typeof HIJACKABLE_VEHICLE_TYPES)[number];
}

interface CandidateSpawn {
  chunkId: string;
  headingDegrees: number;
  position: SliceVector3;
  roadId: string;
  segmentIndex: number;
  slotIndex: number;
  sortBucket: number;
}

const BOUNDS_PADDING = 10;
const MIN_SEGMENT_LENGTH = 40;
const MIN_STARTER_CLEARANCE = 24;
const MIN_SECONDARY_SPACING = 18;
const ROAD_SLOT_RATIOS = [0.2, 0.5, 0.8] as const;

function calculateHeadingDegrees(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
  return (Math.atan2(end.x - start.x, end.z - start.z) * 180) / Math.PI;
}

function calculateHorizontalDistance(a: SliceVector3, b: SliceVector3): number {
  const deltaX = a.x - b.x;
  const deltaZ = a.z - b.z;

  return Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
}

function calculateSegmentLength(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
  return calculateHorizontalDistance(start, end);
}

function interpolateRoadPoint(
  start: SliceRoad["points"][number],
  end: SliceRoad["points"][number],
  ratio: number
): SliceVector3 {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    z: start.z + (end.z - start.z) * ratio
  };
}

function isWithinBounds(position: SliceVector3, bounds: SliceBounds): boolean {
  return (
    position.x >= bounds.minX + BOUNDS_PADDING &&
    position.x <= bounds.maxX - BOUNDS_PADDING &&
    position.z >= bounds.minZ + BOUNDS_PADDING &&
    position.z <= bounds.maxZ - BOUNDS_PADDING
  );
}

function resolveChunkId(position: SliceVector3, chunks: readonly SliceChunk[], fallbackChunkId: string): string {
  const chunk = chunks.find(
    (candidate) =>
      position.x >= candidate.origin.x &&
      position.x <= candidate.origin.x + candidate.size.width &&
      position.z >= candidate.origin.z &&
      position.z <= candidate.origin.z + candidate.size.depth
  );

  return chunk?.id ?? fallbackChunkId;
}

function collectCandidateSpawns(manifest: SliceManifest, spawnCandidate: SpawnCandidate): CandidateSpawn[] {
  const candidates: CandidateSpawn[] = [];

  manifest.roads.forEach((road, roadIndex) => {
    for (let segmentIndex = 0; segmentIndex < road.points.length - 1; segmentIndex += 1) {
      const start = road.points[segmentIndex];
      const end = road.points[segmentIndex + 1];

      if (!start || !end || calculateSegmentLength(start, end) < MIN_SEGMENT_LENGTH) {
        continue;
      }

      ROAD_SLOT_RATIOS.forEach((ratio, slotIndex) => {
        const position = interpolateRoadPoint(start, end, ratio);

        if (!isWithinBounds(position, manifest.bounds)) {
          return;
        }

        if (calculateHorizontalDistance(position, spawnCandidate.position) < MIN_STARTER_CLEARANCE) {
          return;
        }

        candidates.push({
          chunkId: resolveChunkId(position, manifest.chunks, spawnCandidate.chunkId),
          headingDegrees: calculateHeadingDegrees(start, end),
          position,
          roadId: road.id,
          segmentIndex,
          slotIndex,
          sortBucket: road.id === spawnCandidate.roadId ? 1 : 0
        });
      });
    }

    if (roadIndex >= HIJACKABLE_VEHICLE_TYPES.length && candidates.length >= HIJACKABLE_VEHICLE_TYPES.length) {
      return;
    }
  });

  return candidates.sort((left, right) => {
    if (left.sortBucket !== right.sortBucket) {
      return left.sortBucket - right.sortBucket;
    }

    if (left.roadId !== right.roadId) {
      return left.roadId.localeCompare(right.roadId);
    }

    if (left.segmentIndex !== right.segmentIndex) {
      return left.segmentIndex - right.segmentIndex;
    }

    return left.slotIndex - right.slotIndex;
  });
}

export function createHijackableVehicleSpawns(
  manifest: SliceManifest,
  spawnCandidate: SpawnCandidate
): HijackableVehicleSpawn[] {
  const selected: CandidateSpawn[] = [];

  for (const candidate of collectCandidateSpawns(manifest, spawnCandidate)) {
    if (
      selected.some(
        (selectedCandidate) =>
          calculateHorizontalDistance(selectedCandidate.position, candidate.position) < MIN_SECONDARY_SPACING
      )
    ) {
      continue;
    }

    selected.push(candidate);

    if (selected.length === HIJACKABLE_VEHICLE_TYPES.length) {
      break;
    }
  }

  return selected.map((candidate, index) => ({
    chunkId: candidate.chunkId,
    headingDegrees: candidate.headingDegrees,
    id: `${candidate.roadId}-secondary-${candidate.segmentIndex}-${candidate.slotIndex}`,
    position: candidate.position,
    roadId: candidate.roadId,
    vehicleType: HIJACKABLE_VEHICLE_TYPES[index]
  }));
}
