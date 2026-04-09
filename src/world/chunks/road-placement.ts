import type { SliceBounds, SliceChunk, SliceRoad, SliceVector3 } from "./slice-manifest";

export interface RoadPlacementCandidate {
  chunkId: string;
  distanceAlongRoad: number;
  headingDegrees: number;
  position: SliceVector3;
  roadId: string;
  segmentIndex: number;
  slotIndex: number;
  sortBucket: number;
}

export interface CollectRoadPlacementCandidatesOptions {
  bounds: SliceBounds;
  boundsPadding: number;
  chunks: readonly SliceChunk[];
  deprioritizedRoadId?: string;
  fallbackChunkId: string;
  minimumSegmentLength: number;
  minimumStarterClearance: number;
  roads: readonly SliceRoad[];
  slotRatios: readonly number[];
  starterPosition: SliceVector3;
}

export interface SelectSpacedRoadPlacementsOptions {
  candidates: readonly RoadPlacementCandidate[];
  limit: number;
  minimumSpacing: number;
  reservedPositions?: readonly SliceVector3[];
}

export function calculateHeadingDegrees(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
  return (Math.atan2(end.x - start.x, end.z - start.z) * 180) / Math.PI;
}

export function calculateHorizontalDistance(a: SliceVector3, b: SliceVector3): number {
  const deltaX = a.x - b.x;
  const deltaZ = a.z - b.z;

  return Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
}

export function calculateSegmentLength(start: SliceRoad["points"][number], end: SliceRoad["points"][number]): number {
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

function isWithinBounds(position: SliceVector3, bounds: SliceBounds, padding: number): boolean {
  return (
    position.x >= bounds.minX + padding &&
    position.x <= bounds.maxX - padding &&
    position.z >= bounds.minZ + padding &&
    position.z <= bounds.maxZ - padding
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

export function collectRoadPlacementCandidates(
  options: CollectRoadPlacementCandidatesOptions
): RoadPlacementCandidate[] {
  const {
    bounds,
    boundsPadding,
    chunks,
    deprioritizedRoadId,
    fallbackChunkId,
    minimumSegmentLength,
    minimumStarterClearance,
    roads,
    slotRatios,
    starterPosition
  } = options;
  const candidates: RoadPlacementCandidate[] = [];

  roads.forEach((road) => {
    let distanceBeforeSegment = 0;

    for (let segmentIndex = 0; segmentIndex < road.points.length - 1; segmentIndex += 1) {
      const start = road.points[segmentIndex];
      const end = road.points[segmentIndex + 1];

      if (!start || !end) {
        continue;
      }

      const segmentLength = calculateSegmentLength(start, end);

      if (segmentLength < minimumSegmentLength) {
        distanceBeforeSegment += segmentLength;
        continue;
      }

      slotRatios.forEach((ratio, slotIndex) => {
        const position = interpolateRoadPoint(start, end, ratio);

        if (!isWithinBounds(position, bounds, boundsPadding)) {
          return;
        }

        if (calculateHorizontalDistance(position, starterPosition) < minimumStarterClearance) {
          return;
        }

        candidates.push({
          chunkId: resolveChunkId(position, chunks, fallbackChunkId),
          distanceAlongRoad: distanceBeforeSegment + segmentLength * ratio,
          headingDegrees: calculateHeadingDegrees(start, end),
          position,
          roadId: road.id,
          segmentIndex,
          slotIndex,
          sortBucket: road.id === deprioritizedRoadId ? 1 : 0
        });
      });

      distanceBeforeSegment += segmentLength;
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

export function selectSpacedRoadPlacements(options: SelectSpacedRoadPlacementsOptions): RoadPlacementCandidate[] {
  const { candidates, limit, minimumSpacing, reservedPositions = [] } = options;
  const selected: RoadPlacementCandidate[] = [];

  for (const candidate of candidates) {
    if (
      reservedPositions.some((reservedPosition) => calculateHorizontalDistance(candidate.position, reservedPosition) < minimumSpacing)
    ) {
      continue;
    }

    if (
      selected.some((selectedCandidate) => calculateHorizontalDistance(candidate.position, selectedCandidate.position) < minimumSpacing)
    ) {
      continue;
    }

    selected.push(candidate);

    if (selected.length === limit) {
      break;
    }
  }

  return selected;
}
