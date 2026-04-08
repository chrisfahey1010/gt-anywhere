import { Color3, MeshBuilder, StandardMaterial, Vector3, type Mesh, type Scene, type TransformNode } from "@babylonjs/core";
import type { SliceBounds, SliceVector3 } from "../../world/chunks/slice-manifest";
import type { OnFootMovementState } from "../../vehicles/controllers/player-vehicle-controller";

const ON_FOOT_HEIGHT = 1.8;
const ON_FOOT_RADIUS = 0.3;
const ON_FOOT_MOVE_SPEED = 4.5;

export interface CreateOnFootRuntimeOptions {
  scene: Scene;
  parent: TransformNode;
  startPosition: SliceVector3;
}

export interface UpdateOnFootRuntimeOptions {
  movement: OnFootMovementState;
  facingYaw: number;
  deltaSeconds: number;
  sliceBounds: SliceBounds;
}

export interface OnFootRuntime {
  mesh: Mesh;
  eyeHeight: number;
  radius: number;
  update(options: UpdateOnFootRuntimeOptions): void;
  dispose(): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createOnFootRuntime(options: CreateOnFootRuntimeOptions): OnFootRuntime {
  const { parent, scene, startPosition } = options;
  const actor = MeshBuilder.CreateBox(
    "on-foot-actor",
    {
      width: ON_FOOT_RADIUS * 2,
      depth: ON_FOOT_RADIUS * 2,
      height: ON_FOOT_HEIGHT
    },
    scene
  );
  const material = new StandardMaterial("on-foot-actor-material", scene);
  material.diffuseColor = Color3.FromHexString("#f7ede2");

  actor.parent = parent;
  actor.material = material;
  actor.position.copyFromFloats(startPosition.x, startPosition.y + ON_FOOT_HEIGHT / 2, startPosition.z);
  actor.metadata = {
    kind: "on-foot-actor"
  };

  const movementVector = new Vector3();
  const forwardVector = new Vector3();
  const rightVector = new Vector3();

  return {
    mesh: actor,
    eyeHeight: ON_FOOT_HEIGHT * 0.85,
    radius: ON_FOOT_RADIUS,
    update: ({ deltaSeconds, facingYaw, movement, sliceBounds }) => {
      actor.rotation.y = facingYaw;

      forwardVector.copyFromFloats(Math.sin(facingYaw), 0, Math.cos(facingYaw));
      rightVector.copyFromFloats(forwardVector.z, 0, -forwardVector.x);
      movementVector.copyFrom(forwardVector.scale(movement.forward));
      movementVector.addInPlace(rightVector.scale(movement.right));

      if (movementVector.lengthSquared() > 1) {
        movementVector.normalize();
      }

      movementVector.scaleInPlace(ON_FOOT_MOVE_SPEED * deltaSeconds);
      actor.position.addInPlace(movementVector);

      actor.position.x = clamp(actor.position.x, sliceBounds.minX + ON_FOOT_RADIUS, sliceBounds.maxX - ON_FOOT_RADIUS);
      actor.position.z = clamp(actor.position.z, sliceBounds.minZ + ON_FOOT_RADIUS, sliceBounds.maxZ - ON_FOOT_RADIUS);
      actor.position.y = startPosition.y + ON_FOOT_HEIGHT / 2;
    },
    dispose: () => {
      material.dispose();
      actor.dispose();
    }
  };
}
