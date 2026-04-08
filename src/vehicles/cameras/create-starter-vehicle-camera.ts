import { TargetCamera, Vector3, Scalar, Matrix, type AbstractMesh, type Scene } from "@babylonjs/core";
import type { PlayerVehicleController, VehicleControlState } from "../controllers/player-vehicle-controller";

const FORWARD_AXIS = new Vector3(0, 0, 1);
const UP_AXIS = new Vector3(0, 1, 0);

export interface CreateStarterVehicleCameraOptions {
  scene: Scene;
  target: AbstractMesh;
  controller: PlayerVehicleController;
  getInputState?(): VehicleControlState;
}

export interface StarterVehicleCamera extends TargetCamera {
  setVehicleTarget(target: AbstractMesh): void;
}

export function createStarterVehicleCamera(options: CreateStarterVehicleCameraOptions): StarterVehicleCamera {
  const { scene, target, controller } = options;
  const getInputState = options.getInputState ?? (() => controller.getState());
  let activeTarget = target;

  const baseFov = 0.9;
  const maxFov = 1.1;
  const reverseFov = 1.15;
  const maxSpeedForFov = 30; // approx 108 km/h

  const heightOffset = 2.5;
  const distanceOffset = 8.0;
  const reverseHeightOffset = 3.0;
  const reverseDistanceOffset = 6.0;
  const lookAheadDistance = 5;
  const reverseLookDistance = 4;
  const reverseSpeedThreshold = 1.5;
  const reverseActivationDelay = 0.25;
  const gamepadLookYawSpeed = 2.4;
  const gamepadLookPitchSpeed = 1.8;
  const mouseLookSensitivity = 0.01;

  const initialForward = new Vector3();
  activeTarget.getDirectionToRef(FORWARD_AXIS, initialForward);
  initialForward.y = 0;
  if (initialForward.lengthSquared() === 0) {
    initialForward.copyFromFloats(0, 0, 1);
  } else {
    initialForward.normalize();
  }

  // Initialize slightly behind and above target.
  const initialPos = activeTarget.position.subtract(initialForward.scale(distanceOffset)).add(new Vector3(0, heightOffset, 0));
  const camera = new TargetCamera("starter-vehicle-camera", initialPos, scene);
  camera.fov = baseFov;

  const currentVelocity = Vector3.Zero();
  const currentLookAt = activeTarget.position.add(initialForward.scale(lookAheadDistance));
  const rawForward = initialForward.clone();
  const smoothedForward = initialForward.clone();
  const orbitForward = initialForward.clone();
  const forwardCameraPos = Vector3.Zero();
  const reverseCameraPos = Vector3.Zero();
  const desiredCameraPos = Vector3.Zero();
  const forwardLookAt = Vector3.Zero();
  const reverseLookAt = Vector3.Zero();
  const desiredLookAt = Vector3.Zero();
  let freeLookYaw = 0;
  let freeLookPitch = 0;
  let reverseTimer = 0;
  let reverseBlend = 0;
  const maxFreeLookPitch = Math.PI / 4;
  const minFreeLookPitch = -Math.PI / 6;

  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime();
    const deltaTime = (dt === 0 ? 16 : dt) / 1000;
    // Frame-rate independent lerp factors
    const horizontalLerpFactor = 1.0 - Math.pow(0.001, deltaTime);
    const verticalLerpFactor = 1.0 - Math.pow(0.05, deltaTime); // slower for vertical filtering
    const stateLerpFactor = 1.0 - Math.pow(0.01, deltaTime);

    // 1. Determine velocity
    if (activeTarget.physicsBody) {
      activeTarget.physicsBody.getLinearVelocityToRef(currentVelocity);
    } else {
      currentVelocity.setAll(0);
    }

    activeTarget.getDirectionToRef(FORWARD_AXIS, rawForward);
    rawForward.y = 0;
    if (rawForward.lengthSquared() === 0) {
      rawForward.copyFrom(smoothedForward);
    } else {
      rawForward.normalize();
    }

    smoothedForward.copyFromFloats(
      Scalar.Lerp(smoothedForward.x, rawForward.x, horizontalLerpFactor),
      0,
      Scalar.Lerp(smoothedForward.z, rawForward.z, horizontalLerpFactor)
    );
    if (smoothedForward.lengthSquared() === 0) {
      smoothedForward.copyFrom(rawForward);
    } else {
      smoothedForward.normalize();
    }

    const localVelocityZ = Vector3.Dot(currentVelocity, smoothedForward);

    if (localVelocityZ < -reverseSpeedThreshold) {
      reverseTimer = Math.min(reverseTimer + deltaTime, reverseActivationDelay * 2);
    } else {
      reverseTimer = Math.max(reverseTimer - deltaTime * 2, 0);
    }

    const reverseTarget = reverseTimer >= reverseActivationDelay ? 1 : 0;
    reverseBlend = Scalar.Lerp(reverseBlend, reverseTarget, stateLerpFactor);

    // 2. Dynamic FOV based on speed (forward only, gradual)
    const speedFactor = localVelocityZ > 0 ? Scalar.Clamp(localVelocityZ / maxSpeedForFov, 0, 1) : 0;
    const forwardFov = Scalar.Lerp(baseFov, maxFov, speedFactor);
    const targetFov = Scalar.Lerp(forwardFov, reverseFov, reverseBlend);
    camera.fov = Scalar.Lerp(camera.fov, targetFov, horizontalLerpFactor * 0.5);

    // 3. Free-look logic
    const state = getInputState();
    const hasManualLook = Math.abs(state.lookX) > 0.01 || Math.abs(state.lookY) > 0.01;

    if (hasManualLook) {
      if (state.lookInputSource === "gamepad") {
        freeLookYaw -= state.lookX * gamepadLookYawSpeed * deltaTime;
        freeLookPitch -= state.lookY * gamepadLookPitchSpeed * deltaTime;
      } else {
        freeLookYaw -= state.lookX * mouseLookSensitivity;
        freeLookPitch -= state.lookY * mouseLookSensitivity; // Negative Y moves pitch down
      }
      freeLookPitch = Scalar.Clamp(freeLookPitch, minFreeLookPitch, maxFreeLookPitch);
    } else {
      // Return to center smoothly
      freeLookYaw = Scalar.Lerp(freeLookYaw, 0, horizontalLerpFactor * 2);
      freeLookPitch = Scalar.Lerp(freeLookPitch, 0, horizontalLerpFactor * 2);
    }

    // 4. Orbit logic for base positioning
    // Orbit horizontally around Up axis
    orbitForward.copyFrom(Vector3.TransformNormal(smoothedForward, Matrix.RotationAxis(UP_AXIS, freeLookYaw)));

    // Apply pitch around the new orbital right axis
    const orbitRight = Vector3.Cross(UP_AXIS, orbitForward).normalize();
    orbitForward.copyFrom(Vector3.TransformNormal(orbitForward, Matrix.RotationAxis(orbitRight, freeLookPitch)));

    // 5. Apply Position and Target
    const targetPosition = activeTarget.position;

    // Blend between the normal chase view and a front-mounted reverse view.
    forwardCameraPos.copyFrom(targetPosition);
    forwardCameraPos.addInPlaceFromFloats(
      -orbitForward.x * distanceOffset,
      heightOffset - orbitForward.y * distanceOffset,
      -orbitForward.z * distanceOffset
    );
    reverseCameraPos.copyFrom(targetPosition);
    reverseCameraPos.addInPlaceFromFloats(
      orbitForward.x * reverseDistanceOffset,
      reverseHeightOffset + orbitForward.y * reverseDistanceOffset,
      orbitForward.z * reverseDistanceOffset
    );
    Vector3.LerpToRef(forwardCameraPos, reverseCameraPos, reverseBlend, desiredCameraPos);

    // Interpolate position (rotational damping & vertical filtering)
    camera.position.x = Scalar.Lerp(camera.position.x, desiredCameraPos.x, horizontalLerpFactor);
    camera.position.y = Scalar.Lerp(camera.position.y, desiredCameraPos.y, verticalLerpFactor);
    camera.position.z = Scalar.Lerp(camera.position.z, desiredCameraPos.z, horizontalLerpFactor);

    forwardLookAt.copyFromFloats(
      targetPosition.x + orbitForward.x * lookAheadDistance,
      targetPosition.y,
      targetPosition.z + orbitForward.z * lookAheadDistance
    );
    reverseLookAt.copyFromFloats(
      targetPosition.x - orbitForward.x * reverseLookDistance,
      targetPosition.y,
      targetPosition.z - orbitForward.z * reverseLookDistance
    );
    Vector3.LerpToRef(forwardLookAt, reverseLookAt, reverseBlend, desiredLookAt);

    currentLookAt.copyFromFloats(
      Scalar.Lerp(currentLookAt.x, desiredLookAt.x, horizontalLerpFactor),
      Scalar.Lerp(currentLookAt.y, desiredLookAt.y, verticalLerpFactor),
      Scalar.Lerp(currentLookAt.z, desiredLookAt.z, horizontalLerpFactor)
    );

    camera.setTarget(currentLookAt);
  });

  const starterVehicleCamera = camera as StarterVehicleCamera;
  starterVehicleCamera.setVehicleTarget = (nextTarget: AbstractMesh): void => {
    activeTarget = nextTarget;
    activeTarget.getDirectionToRef(FORWARD_AXIS, rawForward);
    rawForward.y = 0;

    if (rawForward.lengthSquared() === 0) {
      rawForward.copyFrom(smoothedForward);
    } else {
      rawForward.normalize();
    }

    smoothedForward.copyFrom(rawForward);
    orbitForward.copyFrom(rawForward);
    currentLookAt.copyFromFloats(
      activeTarget.position.x + rawForward.x * lookAheadDistance,
      activeTarget.position.y,
      activeTarget.position.z + rawForward.z * lookAheadDistance
    );
  };

  scene.activeCamera = starterVehicleCamera;

  return starterVehicleCamera;
}
