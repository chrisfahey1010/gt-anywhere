import type { AbstractMesh, Vector3 } from "@babylonjs/core";

export interface VehicleInteractionRuntime {
  mesh: Pick<AbstractMesh, "name" | "position">;
}

export interface VehicleInteractionCandidate<TVehicle extends VehicleInteractionRuntime = VehicleInteractionRuntime> {
  isStoredVehicle: boolean;
  vehicle: TVehicle;
}

export interface ResolveVehicleInteractionTargetOptions<
  TVehicle extends VehicleInteractionRuntime = VehicleInteractionRuntime
> {
  actorPosition: Pick<Vector3, "x" | "z">;
  candidates: readonly VehicleInteractionCandidate<TVehicle>[];
  facingYaw: number;
  interactionHalfAngleRadians?: number;
  interactionRange?: number;
}

interface ResolvedVehicleInteractionCandidate<TVehicle extends VehicleInteractionRuntime = VehicleInteractionRuntime>
  extends VehicleInteractionCandidate<TVehicle> {
  facingAngleRadians: number;
  horizontalDistance: number;
}

const DEFAULT_INTERACTION_HALF_ANGLE = Math.PI / 4;
const DEFAULT_INTERACTION_RANGE = 3;
const COMPARISON_EPSILON = 0.0001;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function compareNumbers(left: number, right: number): number {
  if (Math.abs(left - right) <= COMPARISON_EPSILON) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function resolveVehicleInteractionTarget<
  TVehicle extends VehicleInteractionRuntime = VehicleInteractionRuntime
>(options: ResolveVehicleInteractionTargetOptions<TVehicle>): VehicleInteractionCandidate<TVehicle> | null {
  const {
    actorPosition,
    candidates,
    facingYaw,
    interactionHalfAngleRadians = DEFAULT_INTERACTION_HALF_ANGLE,
    interactionRange = DEFAULT_INTERACTION_RANGE
  } = options;
  const forwardX = Math.sin(facingYaw);
  const forwardZ = Math.cos(facingYaw);
  const resolvedCandidates: ResolvedVehicleInteractionCandidate<TVehicle>[] = [];

  for (const candidate of candidates) {
    const deltaX = candidate.vehicle.mesh.position.x - actorPosition.x;
    const deltaZ = candidate.vehicle.mesh.position.z - actorPosition.z;
    const horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    if (horizontalDistance > interactionRange) {
      continue;
    }

    const normalizedX = horizontalDistance <= COMPARISON_EPSILON ? forwardX : deltaX / horizontalDistance;
    const normalizedZ = horizontalDistance <= COMPARISON_EPSILON ? forwardZ : deltaZ / horizontalDistance;
    const facingAngleRadians = Math.acos(clamp(normalizedX * forwardX + normalizedZ * forwardZ, -1, 1));

    if (facingAngleRadians > interactionHalfAngleRadians) {
      continue;
    }

    resolvedCandidates.push({
      ...candidate,
      facingAngleRadians,
      horizontalDistance
    });
  }

  if (resolvedCandidates.length === 0) {
    return null;
  }

  resolvedCandidates.sort((left, right) => {
    const facingComparison = compareNumbers(left.facingAngleRadians, right.facingAngleRadians);

    if (facingComparison !== 0) {
      return facingComparison;
    }

    const distanceComparison = compareNumbers(left.horizontalDistance, right.horizontalDistance);

    if (distanceComparison !== 0) {
      return distanceComparison;
    }

    if (left.isStoredVehicle !== right.isStoredVehicle) {
      return left.isStoredVehicle ? -1 : 1;
    }

    return left.vehicle.mesh.name.localeCompare(right.vehicle.mesh.name);
  });

  return resolvedCandidates[0] ?? null;
}
