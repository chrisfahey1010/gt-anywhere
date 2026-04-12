import { Vector3, type Scene, type TransformNode } from "@babylonjs/core";
import type { PlayerVehicleController } from "../../vehicles/controllers/player-vehicle-controller";
import { loadTuningProfile, type VehicleTuning } from "../../vehicles/physics/vehicle-factory";
import type { SliceManifest, SpawnCandidate, TrafficVehicleDirection, TrafficVehiclePlan } from "../../world/chunks/slice-manifest";
import { planTrafficVehicleControls } from "../agents/traffic-driving";
import { createTrafficRoute, sampleTrafficRoutePoint, type TrafficRoute } from "../routing/traffic-route";
import {
  createTrafficVehicle,
  type CreateTrafficVehicleOptions,
  type TrafficVehicleRuntime
} from "./traffic-vehicle-factory";

const WORLD_FORWARD_AXIS = new Vector3(0, 0, 1);

interface TrafficSystemVehicleState {
  direction: TrafficVehicleDirection;
  plan: TrafficVehiclePlan;
  progress: number;
  route: TrafficRoute;
  runtime: TrafficVehicleRuntime;
  targetSpeed: number;
}

export interface TrafficObstacleVehicle {
  mesh: {
    getDirection?(axis: Vector3): Vector3;
    name: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation?: {
      y: number;
    };
  };
}

export interface CreateTrafficSystemOptions {
  controller: PlayerVehicleController;
  getObstacleVehicles?(): readonly TrafficObstacleVehicle[];
  loadTuningProfile?(vehicleType: string): Promise<VehicleTuning>;
  manifest: SliceManifest;
  parent: TransformNode;
  scene: Scene;
  spawnCandidate: SpawnCandidate;
  spawnTrafficVehicle?(options: CreateTrafficVehicleOptions): TrafficVehicleRuntime;
}

export interface TrafficSystem {
  dispose(): void;
  getVehicles(): readonly TrafficVehicleRuntime[];
  update(deltaSeconds: number): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngleRadians(value: number): number {
  let normalized = value;

  while (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  }

  while (normalized < -Math.PI) {
    normalized += Math.PI * 2;
  }

  return normalized;
}

function getMeshFacingYaw(mesh: TrafficObstacleVehicle["mesh"]): number {
  const forward = mesh.getDirection?.(WORLD_FORWARD_AXIS);

  if (forward) {
    const horizontalMagnitude = Math.hypot(forward.x, forward.z);

    if (horizontalMagnitude > 0.0001) {
      return Math.atan2(forward.x, forward.z);
    }
  }

  return mesh.rotation?.y ?? 0;
}

function getHorizontalSpeed(vehicle: TrafficVehicleRuntime): number {
  const velocity = vehicle.physicsAggregate.body.getLinearVelocity();

  return Math.hypot(velocity.x, velocity.z);
}

function measureObstacleDistance(
  vehicle: TrafficVehicleRuntime,
  dynamicObstacles: readonly TrafficObstacleVehicle[],
  peerVehicles: readonly TrafficVehicleRuntime[]
): number | null {
  const facingYaw = getMeshFacingYaw(vehicle.mesh);
  const forwardX = Math.sin(facingYaw);
  const forwardZ = Math.cos(facingYaw);
  const position = vehicle.mesh.position;
  let nearestDistance: number | null = null;

  const considerObstacle = (obstacle: TrafficObstacleVehicle["mesh"]): void => {
    if (obstacle.name === vehicle.mesh.name) {
      return;
    }

    const deltaX = obstacle.position.x - position.x;
    const deltaZ = obstacle.position.z - position.z;
    const horizontalDistance = Math.hypot(deltaX, deltaZ);

    if (horizontalDistance <= 0.0001 || horizontalDistance > 16) {
      return;
    }

    const aheadDot = (deltaX * forwardX + deltaZ * forwardZ) / horizontalDistance;

    if (aheadDot <= 0.35) {
      return;
    }

    const lateralDistance = Math.abs(-forwardZ * deltaX + forwardX * deltaZ);

    if (lateralDistance > 4.5) {
      return;
    }

    nearestDistance = nearestDistance === null ? horizontalDistance : Math.min(nearestDistance, horizontalDistance);
  };

  dynamicObstacles.forEach((obstacle) => {
    considerObstacle(obstacle.mesh);
  });
  peerVehicles.forEach((peerVehicle) => {
    considerObstacle(peerVehicle.mesh);
  });

  return nearestDistance;
}

function advanceTrafficProgress(state: TrafficSystemVehicleState, deltaSeconds: number, obstacleDistance: number | null): void {
  const fallbackSpeed = state.targetSpeed * 0.35;
  const currentSpeed = getHorizontalSpeed(state.runtime);
  const progressDelta = (obstacleDistance !== null && obstacleDistance <= 4 ? 0 : Math.max(currentSpeed, fallbackSpeed)) * deltaSeconds;

  if (state.direction === "forward") {
    state.progress = Math.min(state.route.totalLength, state.progress + progressDelta);

    if (state.progress >= state.route.totalLength - 1) {
      state.direction = "reverse";
    }

    return;
  }

  state.progress = Math.max(0, state.progress - progressDelta);

  if (state.progress <= 1) {
    state.direction = "forward";
  }
}

export async function createTrafficSystem(options: CreateTrafficSystemOptions): Promise<TrafficSystem> {
  const loadTuning = options.loadTuningProfile ?? loadTuningProfile;
  const spawnTrafficVehicle = options.spawnTrafficVehicle ?? createTrafficVehicle;
  const roadsById = new Map(options.manifest.roads.map((road) => [road.id, road]));
  const trafficPlans = options.manifest.traffic?.vehicles ?? [];
  const vehicleStates: TrafficSystemVehicleState[] = [];

  try {
    for (const plan of trafficPlans) {
      const road = roadsById.get(plan.roadId);

      if (!road) {
        throw new Error(`Missing traffic road '${plan.roadId}' for plan '${plan.id}'.`);
      }

      const route = createTrafficRoute(road);
      const tuning = await loadTuning(plan.vehicleType);
      const runtime = spawnTrafficVehicle({
        controller: options.controller,
        parent: options.parent,
        plan,
        scene: options.scene,
        starterVehicle: options.spawnCandidate.starterVehicle,
        tuning
      });

      vehicleStates.push({
        direction: plan.direction,
        plan,
        progress: clamp(plan.startDistance, 0, route.totalLength),
        route,
        runtime,
        targetSpeed: tuning.maxForwardSpeed * plan.speedScale
      });
    }
  } catch (error) {
    vehicleStates.forEach((state) => {
      state.runtime.dispose();
    });
    throw error;
  }

  const vehicles = vehicleStates.map((state) => state.runtime);

  return {
    dispose: () => {
      vehicleStates.forEach((state) => {
        state.runtime.dispose();
      });
    },
    getVehicles: () => vehicles,
    update: (deltaSeconds: number) => {
      const dynamicObstacles = options.getObstacleVehicles?.() ?? [];

      vehicleStates.forEach((state) => {
        if (state.route.totalLength <= 0) {
          return;
        }

        const obstacleDistance = measureObstacleDistance(state.runtime, dynamicObstacles, vehicles);

        advanceTrafficProgress(state, deltaSeconds, obstacleDistance);

        const currentSpeed = getHorizontalSpeed(state.runtime);
        const lookAheadDistance = clamp(Math.max(6, currentSpeed + 4), 6, 14);
        const targetDistance =
          state.direction === "forward"
            ? Math.min(state.route.totalLength, state.progress + lookAheadDistance)
            : Math.max(0, state.progress - lookAheadDistance);
        const targetPoint = sampleTrafficRoutePoint(state.route, targetDistance);
        const targetYaw = Math.atan2(
          targetPoint.x - state.runtime.mesh.position.x,
          targetPoint.z - state.runtime.mesh.position.z
        );
        const steeringAngleRadians = normalizeAngleRadians(targetYaw - getMeshFacingYaw(state.runtime.mesh));

        state.runtime.update(
          planTrafficVehicleControls({
            currentSpeed,
            obstacleDistance,
            steeringAngleRadians,
            targetSpeed: state.targetSpeed
          })
        );
      });
    }
  };
}
