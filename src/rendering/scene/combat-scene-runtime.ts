import {
  createCombatRuntime,
  getCombatWeaponRoster,
  type CombatEvent,
  type CombatRuntimeSnapshot,
  type CombatTarget,
  type CombatWeapon
} from "../../sandbox/combat/combat-runtime";
import type { CombatInputState } from "../../vehicles/controllers/player-vehicle-controller";
import type {
  SceneChaosPropHit,
  SceneChaosVehicleActor,
  SceneChaosVehicleHit
} from "./chaos-scene-runtime";
import type { ScenePedestrianCombatHit, ScenePedestrianCombatThreat } from "./pedestrian-scene-runtime";

export interface SceneCombatOnFootActor {
  eyeHeight: number;
  mesh: {
    name: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
  radius: number;
}

export interface SceneCombatPedestrianSource {
  consumeEvents?(): unknown;
  dispose?(): void;
  getPedestrians(): ReadonlyArray<{
    currentState: string;
    id: string;
    mesh: {
      metadata?: unknown;
      position: {
        x: number;
        y: number;
        z: number;
      };
    };
  }>;
  update?(...args: unknown[]): unknown;
}

export interface SceneCombatChaosSource {
  dispose?(): void;
  getBreakableProps(): ReadonlyArray<{
    breakState: string;
    id: string;
    mesh: {
      metadata?: unknown;
      position: {
        x: number;
        y: number;
        z: number;
      };
    };
  }>;
}

export interface SceneCombatRuntime {
  dispose(): void;
  getSnapshot(): CombatRuntimeSnapshot;
}

export interface UpdateSceneCombatResult {
  chaosPropHits: SceneChaosPropHit[];
  chaosVehicleHits: SceneChaosVehicleHit[];
  events: CombatEvent[];
  pedestrianCombatHits: ScenePedestrianCombatHit[];
  pedestrianCombatThreats: ScenePedestrianCombatThreat[];
}

export interface ApplyCombatSceneTelemetryOptions {
  canvas: HTMLCanvasElement;
  runtime: SceneCombatRuntime;
  scene: {
    metadata?: unknown;
  };
}

export interface UpdateSceneCombatOptions {
  activeVehicle: SceneChaosVehicleActor;
  chaosRuntime?: SceneCombatChaosSource | null;
  combatControls: CombatInputState;
  combatEnabled: boolean;
  deltaSeconds: number;
  facingYaw: number;
  hijackableVehicles?: readonly SceneChaosVehicleActor[];
  lookPitch: number;
  onFootActor?: SceneCombatOnFootActor | null;
  pedestrianSystem?: SceneCombatPedestrianSource | null;
  runtime: SceneCombatRuntime;
  trafficVehicles?: readonly SceneChaosVehicleActor[];
}

interface RuntimeState extends SceneCombatRuntime {
  combatRuntime: ReturnType<typeof createCombatRuntime>;
  currentTimeSeconds: number;
}

const PEDESTRIAN_TARGET_RADIUS = 0.45;
const PEDESTRIAN_TARGET_Y_OFFSET = 0.55;

function hasInteractionRole(mesh: { metadata?: unknown }, roles: readonly string[]): boolean {
  if (!mesh.metadata || typeof mesh.metadata !== "object") {
    return false;
  }

  const interactionRole = (mesh.metadata as { interactionRole?: unknown }).interactionRole;

  return typeof interactionRole === "string" && roles.includes(interactionRole);
}

function getVehicleTargetRadius(vehicle: SceneChaosVehicleActor): number {
  return Math.max(vehicle.tuning.dimensions.width, vehicle.tuning.dimensions.length) * 0.4;
}

function createOnFootAimOrigin(onFootActor: SceneCombatOnFootActor): { x: number; y: number; z: number } {
  return {
    x: onFootActor.mesh.position.x,
    y: onFootActor.mesh.position.y + onFootActor.eyeHeight - onFootActor.radius * 3,
    z: onFootActor.mesh.position.z
  };
}

function createCombatTargets(options: {
  activeVehicle: SceneChaosVehicleActor;
  chaosRuntime?: SceneCombatChaosSource | null;
  hijackableVehicles: readonly SceneChaosVehicleActor[];
  pedestrianSystem: SceneCombatPedestrianSource | null;
  trafficVehicles: readonly SceneChaosVehicleActor[];
}): CombatTarget[] {
  const targets: CombatTarget[] = [];

  const vehicles = [options.activeVehicle, ...options.hijackableVehicles, ...options.trafficVehicles];
  vehicles.forEach((vehicle) => {
    if (!hasInteractionRole(vehicle.mesh, ["active", "hijackable", "traffic"])) {
      return;
    }

    targets.push({
      id: vehicle.mesh.name,
      kind: "vehicle",
      position: vehicle.mesh.position,
      radius: getVehicleTargetRadius(vehicle)
    });
  });

  options.pedestrianSystem?.getPedestrians().forEach((pedestrian) => {
    if (pedestrian.currentState === "struck" || !hasInteractionRole(pedestrian.mesh, ["pedestrian"])) {
      return;
    }

    targets.push({
      id: pedestrian.id,
      kind: "pedestrian",
      position: {
        x: pedestrian.mesh.position.x,
        y: pedestrian.mesh.position.y + PEDESTRIAN_TARGET_Y_OFFSET,
        z: pedestrian.mesh.position.z
      },
      radius: PEDESTRIAN_TARGET_RADIUS
    });
  });

  options.chaosRuntime?.getBreakableProps().forEach((prop) => {
    if (prop.breakState !== "intact" || !hasInteractionRole(prop.mesh, ["breakable-prop"])) {
      return;
    }

    targets.push({
      id: prop.id,
      kind: "prop",
      position: prop.mesh.position,
      radius: 0.8
    });
  });

  return targets;
}

function findWeapon(weaponId: CombatEvent["weaponId"]): CombatWeapon {
  return getCombatWeaponRoster().find((weapon) => weapon.id === weaponId) ?? getCombatWeaponRoster()[0];
}

function createShotSourceId(event: { shotCount: number; weaponId: CombatEvent["weaponId"] }): string {
  return `${event.weaponId}-shot-${event.shotCount}`;
}

export function createSceneCombatRuntime(): SceneCombatRuntime {
  const combatRuntime = createCombatRuntime();

  const runtime: RuntimeState = {
    combatRuntime,
    currentTimeSeconds: 0,
    dispose: () => {},
    getSnapshot: () => combatRuntime.getSnapshot()
  };

  return runtime;
}

export function disposeSceneCombatRuntime(runtime: SceneCombatRuntime | null): void {
  runtime?.dispose();
}

export function updateSceneCombat(options: UpdateSceneCombatOptions): UpdateSceneCombatResult {
  const runtime = options.runtime as RuntimeState;
  const pedestrianSystem = options.pedestrianSystem ?? null;
  const hijackableVehicles = options.hijackableVehicles ?? [];
  const trafficVehicles = options.trafficVehicles ?? [];

  runtime.currentTimeSeconds += options.deltaSeconds;

  const events = runtime.combatRuntime.update({
    aim: {
      facingYaw: options.facingYaw,
      lookPitch: options.lookPitch,
      origin: options.onFootActor ? createOnFootAimOrigin(options.onFootActor) : { x: 0, y: 0, z: 0 }
    },
    combatEnabled: options.combatEnabled && options.onFootActor !== null && options.onFootActor !== undefined,
    currentTimeSeconds: runtime.currentTimeSeconds,
    input: options.combatControls,
    targets: createCombatTargets({
      activeVehicle: options.activeVehicle,
      chaosRuntime: options.chaosRuntime ?? null,
      hijackableVehicles,
      pedestrianSystem,
      trafficVehicles
    })
  });

  const chaosPropHits: SceneChaosPropHit[] = [];
  const chaosVehicleHits: SceneChaosVehicleHit[] = [];
  const pedestrianCombatHits: ScenePedestrianCombatHit[] = [];
  const pedestrianCombatThreats: ScenePedestrianCombatThreat[] = [];

  events.forEach((event) => {
    if (event.type === "combat.target.hit") {
      const sourceId = createShotSourceId(event);

      if (event.targetKind === "pedestrian") {
        pedestrianCombatHits.push({
          pedestrianId: event.targetId,
          sourceId
        });
      }

      if (event.targetKind === "prop") {
        chaosPropHits.push({
          impactSpeed: event.impactSpeed,
          propId: event.targetId,
          sourceId
        });
      }

      if (event.targetKind === "vehicle") {
        chaosVehicleHits.push({
          impactSpeed: event.impactSpeed,
          sourceId,
          targetVehicleId: event.targetId
        });
      }
    }

    if (event.type === "combat.target.threatened" && event.targetKind === "pedestrian" && options.onFootActor) {
      const weapon = findWeapon(event.weaponId);

      pedestrianCombatThreats.push({
        id: createShotSourceId(event),
        kind: "gunfire",
        position: createOnFootAimOrigin(options.onFootActor),
        radius: weapon.threatRadius
      });
    }
  });

  return {
    chaosPropHits,
    chaosVehicleHits,
    events,
    pedestrianCombatHits,
    pedestrianCombatThreats
  };
}

export function applyCombatSceneTelemetry(options: ApplyCombatSceneTelemetryOptions): void {
  const snapshot = options.runtime.getSnapshot();
  const recentEventTypes = snapshot.recentEvents.map((event) => event.type);

  if (options.scene.metadata && typeof options.scene.metadata === "object") {
    Object.assign(options.scene.metadata, {
      combatActiveWeapon: snapshot.activeWeaponId,
      combatHitCount: snapshot.hitCount,
      combatRecentEvents: recentEventTypes,
      combatTargetCount: snapshot.targetCount,
      combatTargetIds: snapshot.recentTargetIds
    });
  }

  options.canvas.dataset.combatActiveWeapon = snapshot.activeWeaponId;
  options.canvas.dataset.combatHitCount = String(snapshot.hitCount);
  options.canvas.dataset.combatRecentEvents = recentEventTypes.join(",");
  options.canvas.dataset.combatTargetCount = String(snapshot.targetCount);
  options.canvas.dataset.combatTargetIds = snapshot.recentTargetIds.join(",");
}
