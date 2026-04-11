import { Vector3, type Scene, type TransformNode } from "@babylonjs/core";
import {
  evaluateResponderContact,
  getResponderSpawnDistance,
  getResponderTargetDistance
} from "../../sandbox/heat/heat-responder-policy";
import { HEAT_RESPONDER_COUNT_BY_LEVEL } from "../../sandbox/heat/heat-pursuit-config";
import type { HeatPursuitContact, HeatRuntimeSnapshot } from "../../sandbox/heat/heat-runtime";
import { planTrafficVehicleControls } from "../../traffic/agents/traffic-driving";
import { createTrafficRoute, sampleTrafficRoutePoint, type TrafficRoute } from "../../traffic/routing/traffic-route";
import {
  createTrafficVehicle,
  type CreateTrafficVehicleOptions,
  type TrafficVehicleRuntime
} from "../../traffic/runtime/traffic-vehicle-factory";
import type { PlayerVehicleController } from "../../vehicles/controllers/player-vehicle-controller";
import { loadTuningProfile, type VehicleTuning } from "../../vehicles/physics/vehicle-factory";
import type { ManagedVehicleRuntime } from "../../vehicles/physics/vehicle-manager";
import type { SliceManifest, SliceRoad, SpawnCandidate, TrafficVehiclePlan } from "../../world/chunks/slice-manifest";
import { resolveCurrentRoad } from "./world-navigation";

const RESPONDER_ROUTE_LOOKAHEAD_DISTANCE = 8;
const RESPONDER_TARGET_SPEED_SCALE = 0.85;
const RESPONDER_VEHICLE_TYPE = "sedan";
const WORLD_FORWARD_AXIS = new Vector3(0, 0, 1);

interface ResponderVehicleState {
  plan: TrafficVehiclePlan;
  route: TrafficRoute;
  runtime: TrafficVehicleRuntime;
}

export interface SceneResponderUpdate {
  pursuitContact: HeatPursuitContact;
  responderCount: number;
}

export interface SceneResponderRuntime {
  dispose(): void;
  getVehicles(): readonly TrafficVehicleRuntime[];
  update(options: {
    activeVehicle: ManagedVehicleRuntime;
    deltaSeconds: number;
    heatSnapshot: HeatRuntimeSnapshot;
  }): SceneResponderUpdate;
}

export interface CreateSceneResponderRuntimeOptions {
  controller: PlayerVehicleController;
  loadTuningProfile?(vehicleType: string): Promise<VehicleTuning>;
  manifest: SliceManifest;
  parent: TransformNode;
  scene: Scene;
  spawnCandidate: SpawnCandidate;
  spawnResponderVehicle?(options: CreateTrafficVehicleOptions): TrafficVehicleRuntime;
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

function getMeshFacingYaw(mesh: TrafficVehicleRuntime["mesh"]): number {
  const forward = mesh.getDirection?.(WORLD_FORWARD_AXIS);

  if (forward) {
    const horizontalMagnitude = Math.hypot(forward.x, forward.z);

    if (horizontalMagnitude > 0.0001) {
      return Math.atan2(forward.x, forward.z);
    }
  }

  return mesh.rotation.y;
}

function getHorizontalSpeed(vehicle: TrafficVehicleRuntime): number {
  const velocity = vehicle.physicsAggregate.body.getLinearVelocity();

  return Math.hypot(velocity.x, velocity.z);
}

function resolveRouteProgress(route: TrafficRoute, position: { x: number; z: number }): number {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProgress = 0;

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index];
    const end = route.points[index + 1];
    const segmentStartDistance = route.cumulativeDistances[index] ?? 0;
    const segmentEndDistance = route.cumulativeDistances[index + 1] ?? segmentStartDistance;

    if (!start || !end) {
      continue;
    }

    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const segmentLengthSquared = deltaX * deltaX + deltaZ * deltaZ;

    if (segmentLengthSquared <= 0) {
      continue;
    }

    const projection =
      ((position.x - start.x) * deltaX + (position.z - start.z) * deltaZ) / segmentLengthSquared;
    const clampedProjection = clamp(projection, 0, 1);
    const closestX = start.x + deltaX * clampedProjection;
    const closestZ = start.z + deltaZ * clampedProjection;
    const distance = Math.hypot(position.x - closestX, position.z - closestZ);

    if (distance >= bestDistance) {
      continue;
    }

    bestDistance = distance;
    bestProgress = segmentStartDistance + (segmentEndDistance - segmentStartDistance) * clampedProjection;
  }

  return bestProgress;
}

function createResponderPlan(options: {
  index: number;
  route: TrafficRoute;
  road: SliceRoad;
  spawnCandidate: SpawnCandidate;
  progress: number;
}): TrafficVehiclePlan {
  const spawnDistance = clamp(
    options.progress - getResponderSpawnDistance(options.index),
    0,
    options.route.totalLength
  );
  const position = sampleTrafficRoutePoint(options.route, spawnDistance);
  const headingTarget = sampleTrafficRoutePoint(
    options.route,
    clamp(spawnDistance + RESPONDER_ROUTE_LOOKAHEAD_DISTANCE, 0, options.route.totalLength)
  );
  const headingDegrees = (Math.atan2(headingTarget.x - position.x, headingTarget.z - position.z) * 180) / Math.PI;

  return {
    chunkId: options.spawnCandidate.chunkId,
    direction: "forward",
    headingDegrees,
    id: `responder-${options.index}`,
    position,
    roadId: options.road.id,
    speedScale: 1,
    startDistance: spawnDistance,
    vehicleType: RESPONDER_VEHICLE_TYPE
  };
}

function syncResponderMetadata(runtime: TrafficVehicleRuntime): void {
  runtime.mesh.metadata = {
    ...runtime.mesh.metadata,
    interactionRole: "responder",
    responderVehicleId: runtime.id
  };
}

function measureNearestResponderDistance(
  activeVehicle: ManagedVehicleRuntime,
  responders: readonly ResponderVehicleState[]
): number | null {
  let nearestDistance: number | null = null;

  responders.forEach((responder) => {
    const deltaX = responder.runtime.mesh.position.x - activeVehicle.mesh.position.x;
    const deltaZ = responder.runtime.mesh.position.z - activeVehicle.mesh.position.z;
    const distance = Math.hypot(deltaX, deltaZ);

    nearestDistance = nearestDistance === null ? distance : Math.min(nearestDistance, distance);
  });

  return nearestDistance;
}

export async function createSceneResponderRuntime(
  options: CreateSceneResponderRuntimeOptions
): Promise<SceneResponderRuntime> {
  const loadTuning = options.loadTuningProfile ?? loadTuningProfile;
  const spawnResponderVehicle = options.spawnResponderVehicle ?? createTrafficVehicle;
  const responderTuning = await loadTuning(RESPONDER_VEHICLE_TYPE);
  const roadsById = new Map(options.manifest.roads.map((road) => [road.id, road]));
  const routeCache = new Map<string, TrafficRoute>();
  const responders: ResponderVehicleState[] = [];
  let directContactEstablished = false;
  let previousRoadId: string | undefined;

  const getRoute = (road: SliceRoad): TrafficRoute => {
    const cachedRoute = routeCache.get(road.id);

    if (cachedRoute) {
      return cachedRoute;
    }

    const route = createTrafficRoute(road);
    routeCache.set(road.id, route);

    return route;
  };

  const spawnResponderAtIndex = (index: number, road: SliceRoad, progress: number): ResponderVehicleState => {
    const route = getRoute(road);
    const plan = createResponderPlan({
      index,
      progress,
      road,
      route,
      spawnCandidate: options.spawnCandidate
    });
    const runtime = spawnResponderVehicle({
      controller: options.controller,
      parent: options.parent,
      plan,
      scene: options.scene,
      starterVehicle: options.spawnCandidate.starterVehicle,
      tuning: responderTuning
    });

    syncResponderMetadata(runtime);

    return {
      plan,
      route,
      runtime
    };
  };

  const disposeResponder = (responder: ResponderVehicleState | undefined): void => {
    responder?.runtime.dispose();
  };

  return {
    dispose: () => {
      responders.splice(0).forEach(disposeResponder);
      directContactEstablished = false;
      previousRoadId = undefined;
    },
    getVehicles: () => responders.map((responder) => responder.runtime),
    update: ({ activeVehicle, heatSnapshot }) => {
      const currentRoad =
        resolveCurrentRoad({
          roads: options.manifest.roads,
          position: {
            x: activeVehicle.mesh.position.x,
            z: activeVehicle.mesh.position.z
          },
          previousRoadId
        }) ?? roadsById.get(options.spawnCandidate.roadId) ?? options.manifest.roads[0] ?? null;

      if (currentRoad === null) {
        responders.splice(0).forEach(disposeResponder);
        directContactEstablished = false;
        previousRoadId = undefined;

        return {
          pursuitContact: "unknown",
          responderCount: 0
        };
      }

      previousRoadId = currentRoad.id;

      const currentRoute = getRoute(currentRoad);
      const playerProgress = resolveRouteProgress(currentRoute, {
        x: activeVehicle.mesh.position.x,
        z: activeVehicle.mesh.position.z
      });
      const targetResponderCount =
        heatSnapshot.pursuitPhase === "none" ? 0 : HEAT_RESPONDER_COUNT_BY_LEVEL[heatSnapshot.level];

      while (responders.length > targetResponderCount) {
        disposeResponder(responders.pop());
      }

      while (responders.length < targetResponderCount) {
        responders.push(spawnResponderAtIndex(responders.length, currentRoad, playerProgress));
      }

      responders.forEach((responder, index) => {
        if (responder.plan.roadId !== currentRoad.id) {
          disposeResponder(responder);
          responders[index] = spawnResponderAtIndex(index, currentRoad, playerProgress);
          responder = responders[index]!;
        }

        const targetDistance = clamp(
          playerProgress - getResponderTargetDistance(index),
          0,
          responder.route.totalLength
        );
        const targetPoint = sampleTrafficRoutePoint(responder.route, targetDistance);
        const targetYaw = Math.atan2(
          targetPoint.x - responder.runtime.mesh.position.x,
          targetPoint.z - responder.runtime.mesh.position.z
        );
        const steeringAngleRadians = normalizeAngleRadians(targetYaw - getMeshFacingYaw(responder.runtime.mesh));

        responder.runtime.update(
          planTrafficVehicleControls({
            currentSpeed: getHorizontalSpeed(responder.runtime),
            obstacleDistance: null,
            steeringAngleRadians,
            targetSpeed: responder.runtime.tuning.maxForwardSpeed * RESPONDER_TARGET_SPEED_SCALE
          })
        );
      });

      const responderContact = evaluateResponderContact({
        directContactEstablished,
        heatSnapshot,
        nearestResponderDistance: measureNearestResponderDistance(activeVehicle, responders)
      });

      directContactEstablished = responderContact.directContactEstablished;

      if (heatSnapshot.pursuitPhase === "none" || heatSnapshot.responderCount <= 0) {
        directContactEstablished = false;
      }

      return {
        pursuitContact: responderContact.contact,
        responderCount: responders.length
      };
    }
  };
}

export function disposeSceneResponderRuntime(runtime: SceneResponderRuntime | null): void {
  runtime?.dispose();
}
