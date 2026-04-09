import type { VehicleControlState } from "../../vehicles/controllers/player-vehicle-controller";

export interface PlanTrafficVehicleControlsOptions {
  currentSpeed: number;
  obstacleDistance: number | null;
  steeringAngleRadians: number;
  targetSpeed: number;
}

const MAX_STEERING_ANGLE = Math.PI / 3;
const CAUTION_DISTANCE = 7.5;
const STOP_DISTANCE = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createIdleControls(): VehicleControlState {
  return {
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: false,
    lookX: 0,
    lookY: 0,
    lookInputSource: "none"
  };
}

export function planTrafficVehicleControls(options: PlanTrafficVehicleControlsOptions): VehicleControlState {
  const { currentSpeed, obstacleDistance, steeringAngleRadians, targetSpeed } = options;
  const controls = createIdleControls();

  controls.steering = clamp(steeringAngleRadians / MAX_STEERING_ANGLE, -1, 1);

  if (obstacleDistance !== null && obstacleDistance <= STOP_DISTANCE) {
    controls.brake = 1;
    controls.handbrake = currentSpeed < 1;

    return controls;
  }

  if (obstacleDistance !== null && obstacleDistance <= CAUTION_DISTANCE) {
    controls.throttle = 0.1;
    controls.brake = 0.6;

    return controls;
  }

  if (currentSpeed < targetSpeed - 1) {
    controls.throttle = 0.85;
  } else if (currentSpeed > targetSpeed + 1) {
    controls.brake = 0.35;
  } else {
    controls.throttle = 0.35;
  }

  return controls;
}
