import { Vector3, type AbstractMesh } from "@babylonjs/core";
import type { SliceBounds } from "../../world/chunks/slice-manifest";

const FORWARD_AXIS = new Vector3(0, 0, 1);
const RIGHT_AXIS = new Vector3(1, 0, 0);
const DEFAULT_AVATAR_HEIGHT = 1.8;
const DEFAULT_AVATAR_RADIUS = 0.35;
const EXIT_CLEARANCE = 0.4;
const OVERLAP_EPSILON = 0.01;

export type ExitAnchor = "driver-side" | "passenger-side" | "rear";

export interface ExitPlacementResult {
  anchor: ExitAnchor;
  position: Vector3;
}

export interface FindSafeExitPositionOptions {
  vehicleMesh: AbstractMesh;
  surfaceMeshes: readonly AbstractMesh[];
  blockingMeshes: readonly AbstractMesh[];
  sliceBounds: SliceBounds;
  avatarHeight?: number;
  avatarRadius?: number;
}

function isWithinBounds(position: Vector3, bounds: SliceBounds, radius: number): boolean {
  return (
    position.x >= bounds.minX + radius &&
    position.x <= bounds.maxX - radius &&
    position.z >= bounds.minZ + radius &&
    position.z <= bounds.maxZ - radius
  );
}

function boxesOverlap(
  minimumA: Vector3,
  maximumA: Vector3,
  minimumB: Vector3,
  maximumB: Vector3,
  epsilon = OVERLAP_EPSILON
): boolean {
  return !(
    maximumA.x <= minimumB.x + epsilon ||
    minimumA.x >= maximumB.x - epsilon ||
    maximumA.y <= minimumB.y + epsilon ||
    minimumA.y >= maximumB.y - epsilon ||
    maximumA.z <= minimumB.z + epsilon ||
    minimumA.z >= maximumB.z - epsilon
  );
}

function getSupportingSurfaceHeight(position: Vector3, radius: number, surfaceMeshes: readonly AbstractMesh[]): number | null {
  let highestSurface: number | null = null;

  surfaceMeshes.forEach((mesh) => {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;

    if (
      position.x < bounds.minimumWorld.x + radius ||
      position.x > bounds.maximumWorld.x - radius ||
      position.z < bounds.minimumWorld.z + radius ||
      position.z > bounds.maximumWorld.z - radius
    ) {
      return;
    }

    highestSurface = highestSurface === null ? bounds.maximumWorld.y : Math.max(highestSurface, bounds.maximumWorld.y);
  });

  return highestSurface;
}

function collidesWithBlockingGeometry(
  position: Vector3,
  avatarHeight: number,
  avatarRadius: number,
  blockingMeshes: readonly AbstractMesh[]
): boolean {
  const candidateMinimum = new Vector3(
    position.x - avatarRadius,
    position.y - avatarHeight / 2,
    position.z - avatarRadius
  );
  const candidateMaximum = new Vector3(
    position.x + avatarRadius,
    position.y + avatarHeight / 2,
    position.z + avatarRadius
  );

  return blockingMeshes.some((mesh) => {
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;

    return boxesOverlap(candidateMinimum, candidateMaximum, bounds.minimumWorld, bounds.maximumWorld);
  });
}

export function findSafeExitPosition(options: FindSafeExitPositionOptions): ExitPlacementResult | null {
  const {
    blockingMeshes,
    sliceBounds,
    surfaceMeshes,
    vehicleMesh,
    avatarHeight = DEFAULT_AVATAR_HEIGHT,
    avatarRadius = DEFAULT_AVATAR_RADIUS
  } = options;
  const vehicleBounds = vehicleMesh.getBoundingInfo().boundingBox.extendSizeWorld;
  const forward = vehicleMesh.getDirection(FORWARD_AXIS).normalize();
  const right = vehicleMesh.getDirection(RIGHT_AXIS).normalize();

  const candidateOffsets: ReadonlyArray<{ anchor: ExitAnchor; offset: Vector3 }> = [
    {
      anchor: "driver-side",
      offset: right.scale(-(vehicleBounds.x + avatarRadius + EXIT_CLEARANCE))
    },
    {
      anchor: "passenger-side",
      offset: right.scale(vehicleBounds.x + avatarRadius + EXIT_CLEARANCE)
    },
    {
      anchor: "rear",
      offset: forward.scale(-(vehicleBounds.z + avatarRadius + EXIT_CLEARANCE))
    }
  ];

  for (const candidate of candidateOffsets) {
    const candidateBase = vehicleMesh.position.add(candidate.offset);

    if (!isWithinBounds(candidateBase, sliceBounds, avatarRadius)) {
      continue;
    }

    const surfaceHeight = getSupportingSurfaceHeight(candidateBase, avatarRadius, surfaceMeshes);

    if (surfaceHeight === null) {
      continue;
    }

    const candidatePosition = new Vector3(candidateBase.x, surfaceHeight + avatarHeight / 2, candidateBase.z);

    if (collidesWithBlockingGeometry(candidatePosition, avatarHeight, avatarRadius, [vehicleMesh, ...blockingMeshes])) {
      continue;
    }

    return {
      anchor: candidate.anchor,
      position: candidatePosition
    };
  }

  return null;
}
