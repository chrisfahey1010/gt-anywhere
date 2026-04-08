import { TargetCamera, Vector3, type AbstractMesh, type Scene } from "@babylonjs/core";

const ON_FOOT_CAMERA_DISTANCE = 3.2;
const ON_FOOT_CAMERA_HEIGHT = 1.7;
const ON_FOOT_LOOK_AHEAD = 6;

export interface CreateOnFootCameraOptions {
  scene: Scene;
  target: AbstractMesh;
}

export interface OnFootCamera extends TargetCamera {
  setTargetActor(target: AbstractMesh): void;
  updateView(facingYaw: number, lookPitch: number): void;
}

export function createOnFootCamera(options: CreateOnFootCameraOptions): OnFootCamera {
  const { scene, target } = options;
  let activeTarget = target;
  const camera = new TargetCamera("on-foot-camera", Vector3.Zero(), scene) as OnFootCamera;
  const anchor = new Vector3();
  const forward = new Vector3();
  const desiredTarget = new Vector3();

  camera.setTargetActor = (nextTarget: AbstractMesh): void => {
    activeTarget = nextTarget;
  };

  camera.updateView = (facingYaw: number, lookPitch: number): void => {
    const cosPitch = Math.cos(lookPitch);

    anchor.copyFrom(activeTarget.position);
    anchor.y += ON_FOOT_CAMERA_HEIGHT;
    forward.copyFromFloats(Math.sin(facingYaw) * cosPitch, Math.sin(lookPitch), Math.cos(facingYaw) * cosPitch);
    desiredTarget.copyFrom(anchor).addInPlace(forward.scale(ON_FOOT_LOOK_AHEAD));

    camera.position.copyFrom(anchor);
    camera.position.addInPlaceFromFloats(
      -forward.x * ON_FOOT_CAMERA_DISTANCE,
      0.4 - forward.y * ON_FOOT_CAMERA_DISTANCE,
      -forward.z * ON_FOOT_CAMERA_DISTANCE
    );
    camera.setTarget(desiredTarget);
  };

  scene.activeCamera = camera;
  camera.updateView(activeTarget.rotation.y, 0);

  return camera;
}
