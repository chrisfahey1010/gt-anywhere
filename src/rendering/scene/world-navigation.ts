import type { SliceRoad, SliceRoadKind } from "../../world/chunks/slice-manifest";

export { formatFallbackRoadDisplayName } from "../../world/generation/road-display-name";

const ROAD_KIND_PRIORITY: Record<SliceRoadKind, number> = {
  primary: 0,
  secondary: 1,
  tertiary: 2
};

const ROAD_RESOLUTION_EPSILON = 0.001;

export interface ResolveCurrentRoadOptions {
  roads: SliceRoad[];
  position: {
    x: number;
    z: number;
  };
  previousRoadId?: string;
}

interface RoadDistanceScore {
  road: SliceRoad;
  distance: number;
}

function getRoadResolutionTolerance(road: SliceRoad): number {
  return Math.max(road.width * 0.75, 12);
}

function getDistanceToSegment(
  position: ResolveCurrentRoadOptions["position"],
  start: SliceRoad["points"][number],
  end: SliceRoad["points"][number]
): number {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const segmentLengthSquared = deltaX * deltaX + deltaZ * deltaZ;

  if (segmentLengthSquared === 0) {
    return Math.hypot(position.x - start.x, position.z - start.z);
  }

  const projection = ((position.x - start.x) * deltaX + (position.z - start.z) * deltaZ) / segmentLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const closestX = start.x + deltaX * clampedProjection;
  const closestZ = start.z + deltaZ * clampedProjection;

  return Math.hypot(position.x - closestX, position.z - closestZ);
}

function getRoadDistanceScore(
  road: SliceRoad,
  position: ResolveCurrentRoadOptions["position"]
): RoadDistanceScore | null {
  if (road.points.length < 2) {
    return null;
  }

  let shortestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < road.points.length - 1; index += 1) {
    const start = road.points[index];
    const end = road.points[index + 1];

    if (!start || !end) {
      continue;
    }

    shortestDistance = Math.min(shortestDistance, getDistanceToSegment(position, start, end));
  }

  if (!Number.isFinite(shortestDistance) || shortestDistance > getRoadResolutionTolerance(road)) {
    return null;
  }

  return {
    road,
    distance: shortestDistance
  };
}

function compareRoadDistanceScores(left: RoadDistanceScore, right: RoadDistanceScore): number {
  if (Math.abs(left.distance - right.distance) > ROAD_RESOLUTION_EPSILON) {
    return left.distance - right.distance;
  }

  if (left.road.kind !== right.road.kind) {
    return ROAD_KIND_PRIORITY[left.road.kind] - ROAD_KIND_PRIORITY[right.road.kind];
  }

  return left.road.id.localeCompare(right.road.id);
}

export function resolveCurrentRoad(options: ResolveCurrentRoadOptions): SliceRoad | null {
  const candidateScores = options.roads
    .map((road) => getRoadDistanceScore(road, options.position))
    .filter((candidate): candidate is RoadDistanceScore => candidate !== null);

  if (candidateScores.length === 0) {
    return null;
  }

  if (options.previousRoadId) {
    const previousRoad = candidateScores.find((candidate) => candidate.road.id === options.previousRoadId);

    if (previousRoad) {
      return previousRoad.road;
    }
  }

  candidateScores.sort(compareRoadDistanceScores);

  return candidateScores[0]?.road ?? null;
}
