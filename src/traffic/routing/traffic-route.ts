import { calculateSegmentLength } from "../../world/chunks/road-placement";
import type { SliceRoad, SliceVector3 } from "../../world/chunks/slice-manifest";

export interface TrafficRoute {
  cumulativeDistances: number[];
  points: SliceRoad["points"];
  roadId: string;
  totalLength: number;
}

function interpolatePoint(start: SliceVector3, end: SliceVector3, ratio: number): SliceVector3 {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
    z: start.z + (end.z - start.z) * ratio
  };
}

export function createTrafficRoute(road: SliceRoad): TrafficRoute {
  const cumulativeDistances = [0];

  for (let index = 0; index < road.points.length - 1; index += 1) {
    const start = road.points[index];
    const end = road.points[index + 1];
    const segmentLength = start && end ? calculateSegmentLength(start, end) : 0;

    cumulativeDistances.push(cumulativeDistances[index] + segmentLength);
  }

  return {
    cumulativeDistances,
    points: road.points,
    roadId: road.id,
    totalLength: cumulativeDistances[cumulativeDistances.length - 1] ?? 0
  };
}

export function sampleTrafficRoutePoint(route: TrafficRoute, distance: number): SliceVector3 {
  if (route.points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  if (route.points.length === 1) {
    return { ...route.points[0]! };
  }

  const clampedDistance = Math.max(0, Math.min(route.totalLength, distance));

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const segmentStartDistance = route.cumulativeDistances[index] ?? 0;
    const segmentEndDistance = route.cumulativeDistances[index + 1] ?? segmentStartDistance;
    const start = route.points[index];
    const end = route.points[index + 1];

    if (!start || !end) {
      continue;
    }

    if (clampedDistance > segmentEndDistance && index < route.points.length - 2) {
      continue;
    }

    const segmentLength = Math.max(segmentEndDistance - segmentStartDistance, 0.0001);
    const segmentDistance = clampedDistance - segmentStartDistance;

    return interpolatePoint(start, end, segmentDistance / segmentLength);
  }

  return { ...(route.points[route.points.length - 1] ?? { x: 0, y: 0, z: 0 }) };
}
