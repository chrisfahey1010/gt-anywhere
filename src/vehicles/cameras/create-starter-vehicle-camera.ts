import { FollowCamera, Vector3, type AbstractMesh, type Scene } from "@babylonjs/core";

export interface CreateStarterVehicleCameraOptions {
  scene: Scene;
  target: AbstractMesh;
}

export function createStarterVehicleCamera(options: CreateStarterVehicleCameraOptions): FollowCamera {
  const { scene, target } = options;
  const camera = new FollowCamera(
    "starter-vehicle-camera",
    new Vector3(target.position.x, target.position.y + 6, target.position.z - 16),
    scene,
    target
  );

  camera.lockedTarget = target;
  camera.radius = 18;
  camera.heightOffset = 6;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.08;
  camera.maxCameraSpeed = 3;
  scene.activeCamera = camera;

  return camera;
}
