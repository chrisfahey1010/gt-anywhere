import { Vector3, type Scene, type TransformNode } from "@babylonjs/core";
import { createPedestrianActor, createPedestrianStateDuration, type PedestrianActorRuntime, type PedestrianState } from "./pedestrian-factory";
import type { SlicePedestrianPlan, SliceSceneVisualPalette } from "../../world/chunks/slice-manifest";

export interface PedestrianThreat {
  id: string;
  kind: "gunfire" | "player" | "vehicle";
  position: {
    x: number;
    y: number;
    z: number;
  };
  radius: number;
}

export interface PedestrianCombatHit {
  pedestrianId: string;
  sourceId: string;
}

export interface PedestrianCollision {
  impactSpeed: number;
  pedestrianId: string;
  sourceId: string;
}

export interface PedestrianEvent {
  impactSpeed?: number;
  pedestrianId: string;
  sourceId?: string;
  state: PedestrianState;
  type: "pedestrian.panicked" | "pedestrian.spawned" | "pedestrian.struck";
}

export interface PedestrianSystemUpdateOptions {
  combatHits?: readonly PedestrianCombatHit[];
  collisions?: readonly PedestrianCollision[];
  deltaSeconds: number;
  threats: readonly PedestrianThreat[];
}

export interface CreatePedestrianSystemOptions {
  parent: TransformNode;
  plan: SlicePedestrianPlan;
  scene: Scene;
  spawnPedestrian?(runtime: {
    parent: TransformNode;
    plan: SlicePedestrianPlan["pedestrians"][number];
    scene: Scene;
    visualPalette?: Pick<SliceSceneVisualPalette, "pedestrianColor">;
  }): PedestrianActorRuntime;
  visualPalette?: Pick<SliceSceneVisualPalette, "pedestrianColor">;
}

export interface PedestrianSystem {
  consumeEvents(): PedestrianEvent[];
  dispose(): void;
  getPedestrians(): readonly PedestrianActorRuntime[];
  update(options: PedestrianSystemUpdateOptions): PedestrianEvent[];
}

const PANIC_SPEED = 3.4;
const WALK_SPEED = 0.9;
const WALK_RADIUS = 3;

function createNextCalmState(currentState: PedestrianActorRuntime["calmState"]): PedestrianActorRuntime["calmState"] {
  if (currentState === "standing") {
    return "walking";
  }

  if (currentState === "walking") {
    return "waiting";
  }

  return "standing";
}

function createForwardVector(yawRadians: number): Vector3 {
  return new Vector3(Math.sin(yawRadians), 0, Math.cos(yawRadians));
}

function measureHorizontalDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function findNearestThreat(
  pedestrian: PedestrianActorRuntime,
  threats: readonly PedestrianThreat[]
): PedestrianThreat | null {
  let nearestThreat: PedestrianThreat | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  threats.forEach((threat) => {
    const distance = measureHorizontalDistance(pedestrian.mesh.position, threat.position);

    if (distance > threat.radius || distance >= nearestDistance) {
      return;
    }

    nearestThreat = threat;
    nearestDistance = distance;
  });

  return nearestThreat;
}

function applyCalmMovement(pedestrian: PedestrianActorRuntime, deltaSeconds: number): void {
  if (pedestrian.currentState !== "walking") {
    return;
  }

  const forward = createForwardVector(pedestrian.baseHeadingRadians);
  const delta = WALK_SPEED * deltaSeconds * pedestrian.walkDirection;
  const nextWalkOffset = pedestrian.walkOffset + delta;

  pedestrian.walkOffset = Math.max(-WALK_RADIUS, Math.min(WALK_RADIUS, nextWalkOffset));

  if (Math.abs(nextWalkOffset) >= WALK_RADIUS) {
    pedestrian.walkDirection = pedestrian.walkDirection === 1 ? -1 : 1;
  }

  pedestrian.mesh.position.x = pedestrian.anchorPosition.x + forward.x * pedestrian.walkOffset;
  pedestrian.mesh.position.z = pedestrian.anchorPosition.z + forward.z * pedestrian.walkOffset;
  pedestrian.mesh.rotation.y = pedestrian.walkDirection === 1 ? pedestrian.baseHeadingRadians : pedestrian.baseHeadingRadians + Math.PI;
}

function transitionCalmState(pedestrian: PedestrianActorRuntime): void {
  const nextState = createNextCalmState(pedestrian.calmState);

  pedestrian.setState(nextState);
  pedestrian.stateTimeRemaining = createPedestrianStateDuration(nextState, pedestrian.id);
}

function applyPanicMovement(pedestrian: PedestrianActorRuntime, threat: PedestrianThreat, deltaSeconds: number): void {
  const awayVector = new Vector3(
    pedestrian.mesh.position.x - threat.position.x,
    0,
    pedestrian.mesh.position.z - threat.position.z
  );

  if (awayVector.lengthSquared() < 0.0001) {
    awayVector.copyFrom(createForwardVector(pedestrian.baseHeadingRadians));
  }

  awayVector.normalize().scaleInPlace(PANIC_SPEED * deltaSeconds);
  pedestrian.mesh.position.addInPlace(awayVector);
  pedestrian.mesh.rotation.y = Math.atan2(awayVector.x, awayVector.z);
}

export function createPedestrianSystem(options: CreatePedestrianSystemOptions): PedestrianSystem {
  const spawnPedestrian = options.spawnPedestrian ?? createPedestrianActor;
  const pedestrians = options.plan.pedestrians.map((plan) =>
    spawnPedestrian({
      parent: options.parent,
      plan,
      scene: options.scene,
      visualPalette: options.visualPalette
    })
  );
  const combatHitsByPedestrianId = new Map<string, PedestrianCombatHit>();
  const collisionsByPedestrianId = new Map<string, PedestrianCollision>();
  const queuedEvents: PedestrianEvent[] = pedestrians.map((pedestrian) => ({
    pedestrianId: pedestrian.id,
    state: pedestrian.currentState,
    type: "pedestrian.spawned"
  }));

  return {
    consumeEvents: () => queuedEvents.splice(0, queuedEvents.length),
    dispose: () => {
      pedestrians.forEach((pedestrian) => {
        pedestrian.dispose();
      });
    },
    getPedestrians: () => pedestrians,
    update: ({ collisions = [], combatHits = [], deltaSeconds, threats }) => {
      const updateEvents: PedestrianEvent[] = [];

      combatHitsByPedestrianId.clear();
      collisionsByPedestrianId.clear();

      combatHits.forEach((combatHit) => {
        combatHitsByPedestrianId.set(combatHit.pedestrianId, combatHit);
      });
      collisions.forEach((collision) => {
        collisionsByPedestrianId.set(collision.pedestrianId, collision);
      });

      pedestrians.forEach((pedestrian) => {
        const combatHit = combatHitsByPedestrianId.get(pedestrian.id);
        const collision = collisionsByPedestrianId.get(pedestrian.id);

        if (combatHit || collision) {
          if (pedestrian.currentState !== "struck") {
            pedestrian.setState("struck");
            updateEvents.push({
              impactSpeed: collision?.impactSpeed,
              pedestrianId: pedestrian.id,
              sourceId: combatHit?.sourceId ?? collision?.sourceId,
              state: pedestrian.currentState,
              type: "pedestrian.struck"
            });
            queuedEvents.push(updateEvents[updateEvents.length - 1]!);
          }

          return;
        }

        const nearestThreat = findNearestThreat(pedestrian, threats);

        if (nearestThreat) {
          if (pedestrian.currentState !== "panic") {
            pedestrian.setState("panic");
            updateEvents.push({
              pedestrianId: pedestrian.id,
              sourceId: nearestThreat.id,
              state: pedestrian.currentState,
              type: "pedestrian.panicked"
            });
            queuedEvents.push(updateEvents[updateEvents.length - 1]!);
          }

          pedestrian.panicTimeRemaining = Math.max(pedestrian.panicTimeRemaining, 1.2);
          applyPanicMovement(pedestrian, nearestThreat, deltaSeconds);

          return;
        }

        if (pedestrian.currentState === "panic") {
          pedestrian.panicTimeRemaining = Math.max(0, pedestrian.panicTimeRemaining - deltaSeconds);

          if (pedestrian.panicTimeRemaining === 0) {
            pedestrian.walkOffset = 0;
            pedestrian.mesh.position.x = pedestrian.anchorPosition.x;
            pedestrian.mesh.position.z = pedestrian.anchorPosition.z;
            pedestrian.setState("standing");
            pedestrian.stateTimeRemaining = createPedestrianStateDuration("standing", pedestrian.id);
          }

          return;
        }

        pedestrian.stateTimeRemaining = Math.max(0, pedestrian.stateTimeRemaining - deltaSeconds);
        applyCalmMovement(pedestrian, deltaSeconds);

        if (pedestrian.stateTimeRemaining === 0) {
          transitionCalmState(pedestrian);
        }
      });

      return updateEvents;
    }
  };
}
