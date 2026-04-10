import type { CombatInputState } from "../../vehicles/controllers/player-vehicle-controller";

export type CombatWeaponId = "sidearm" | "rifle";
export type CombatTargetKind = "pedestrian" | "prop" | "vehicle";

export interface CombatWeapon {
  cooldownSeconds: number;
  displayName: string;
  id: CombatWeaponId;
  impactSpeed: number;
  maxRange: number;
  threatRadius: number;
}

export interface CombatAim {
  facingYaw: number;
  lookPitch: number;
  origin: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CombatTarget {
  id: string;
  kind: CombatTargetKind;
  position: {
    x: number;
    y: number;
    z: number;
  };
  radius: number;
}

export interface CombatWeaponChangedEvent {
  timestampSeconds: number;
  type: "combat.weapon.changed";
  weaponId: CombatWeaponId;
  weaponSlot: number;
}

export interface CombatWeaponFiredEvent {
  impactSpeed: number;
  shotCount: number;
  timestampSeconds: number;
  type: "combat.weapon.fired";
  weaponId: CombatWeaponId;
}

export interface CombatTargetHitEvent {
  distance: number;
  impactSpeed: number;
  shotCount: number;
  targetId: string;
  targetKind: CombatTargetKind;
  timestampSeconds: number;
  type: "combat.target.hit";
  weaponId: CombatWeaponId;
}

export interface CombatTargetThreatenedEvent {
  distance: number;
  shotCount: number;
  targetId: string;
  targetKind: CombatTargetKind;
  timestampSeconds: number;
  type: "combat.target.threatened";
  weaponId: CombatWeaponId;
}

export type CombatEvent =
  | CombatTargetHitEvent
  | CombatTargetThreatenedEvent
  | CombatWeaponChangedEvent
  | CombatWeaponFiredEvent;

export interface CombatRuntimeSnapshot {
  activeWeaponId: CombatWeaponId;
  activeWeaponSlot: number;
  hitCount: number;
  recentEvents: CombatEvent[];
  recentTargetIds: string[];
  shotCount: number;
  targetCount: number;
}

export interface CombatRuntime {
  getSnapshot(): CombatRuntimeSnapshot;
  update(options: {
    aim: CombatAim;
    combatEnabled?: boolean;
    currentTimeSeconds: number;
    input: CombatInputState;
    targets?: readonly CombatTarget[];
  }): CombatEvent[];
}

interface CombatHit {
  distance: number;
  target: CombatTarget;
}

interface CombatThreat {
  distance: number;
  target: CombatTarget;
}

interface CombatShotResolution {
  hit: CombatHit | null;
  threatenedTargets: CombatThreat[];
}

const MAX_RECENT_EVENTS = 4;
const MAX_THREATENED_TARGETS = 4;

const COMBAT_WEAPON_ROSTER: readonly CombatWeapon[] = [
  {
    cooldownSeconds: 0.35,
    displayName: "Sidearm",
    id: "sidearm",
    impactSpeed: 8.5,
    maxRange: 36,
    threatRadius: 2.2
  },
  {
    cooldownSeconds: 0.18,
    displayName: "Rifle",
    id: "rifle",
    impactSpeed: 11.5,
    maxRange: 52,
    threatRadius: 3.2
  }
] as const;

function clampWeaponSlot(slot: number): number {
  const rosterLength = COMBAT_WEAPON_ROSTER.length;

  return ((slot % rosterLength) + rosterLength) % rosterLength;
}

function createAimDirection(aim: CombatAim): { x: number; y: number; z: number } {
  const cosPitch = Math.cos(aim.lookPitch);

  return {
    x: Math.sin(aim.facingYaw) * cosPitch,
    y: Math.sin(aim.lookPitch),
    z: Math.cos(aim.facingYaw) * cosPitch
  };
}

function dotProduct(
  left: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number }
): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function measureDistance(
  left: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number }
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function appendRecentEvents(recentEvents: CombatEvent[], events: readonly CombatEvent[]): CombatEvent[] {
  if (events.length === 0) {
    return recentEvents;
  }

  return [...recentEvents, ...events].slice(-MAX_RECENT_EVENTS);
}

function resolveCombatShot(options: {
  aim: CombatAim;
  targets: readonly CombatTarget[];
  weapon: CombatWeapon;
}): CombatShotResolution {
  const direction = createAimDirection(options.aim);
  let hit: CombatHit | null = null;
  const threatenedTargets: CombatThreat[] = [];

  // Use a lightweight ray-versus-sphere pass over an explicit target list.
  options.targets.forEach((target) => {
    const toTarget = {
      x: target.position.x - options.aim.origin.x,
      y: target.position.y - options.aim.origin.y,
      z: target.position.z - options.aim.origin.z
    };
    const projectedDistance = dotProduct(toTarget, direction);

    if (projectedDistance < 0 || projectedDistance > options.weapon.maxRange) {
      return;
    }

    const targetDistanceSquared = dotProduct(toTarget, toTarget);
    const perpendicularDistanceSquared = Math.max(0, targetDistanceSquared - projectedDistance * projectedDistance);
    const hitRadiusSquared = target.radius * target.radius;

    if (perpendicularDistanceSquared <= hitRadiusSquared) {
      const hitDistance = Math.max(
        0,
        projectedDistance - Math.sqrt(Math.max(0, hitRadiusSquared - perpendicularDistanceSquared))
      );

      if (hit === null || hitDistance < hit.distance) {
        hit = {
          distance: hitDistance,
          target
        };
      }

      return;
    }

    const threatRadius = target.radius + options.weapon.threatRadius;

    if (perpendicularDistanceSquared > threatRadius * threatRadius) {
      return;
    }

    threatenedTargets.push({
      distance: measureDistance(options.aim.origin, target.position),
      target
    });
  });

  const filteredThreats = threatenedTargets
    .filter((threat) => threat.target.id !== hit?.target.id)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, MAX_THREATENED_TARGETS);

  return {
    hit,
    threatenedTargets: filteredThreats
  };
}

export function getCombatWeaponRoster(): readonly CombatWeapon[] {
  return COMBAT_WEAPON_ROSTER;
}

export function createCombatRuntime(): CombatRuntime {
  let activeWeaponSlot = 0;
  let hitCount = 0;
  let lastFireTimeSeconds = Number.NEGATIVE_INFINITY;
  let recentEvents: CombatEvent[] = [];
  let shotCount = 0;
  let targetCount = 0;

  return {
    getSnapshot: () => ({
      activeWeaponId: COMBAT_WEAPON_ROSTER[activeWeaponSlot].id,
      activeWeaponSlot,
      hitCount,
      recentEvents: [...recentEvents],
      recentTargetIds: recentEvents.flatMap((event) => {
        if (event.type === "combat.target.hit" || event.type === "combat.target.threatened") {
          return [event.targetId];
        }

        return [];
      }),
      shotCount,
      targetCount
    }),
    update: ({ aim, combatEnabled = true, currentTimeSeconds, input, targets = [] }) => {
      const events: CombatEvent[] = [];

      if (input.weaponSlotRequested !== null && input.weaponSlotRequested !== activeWeaponSlot) {
        activeWeaponSlot = input.weaponSlotRequested;
        events.push({
          timestampSeconds: currentTimeSeconds,
          type: "combat.weapon.changed",
          weaponId: COMBAT_WEAPON_ROSTER[activeWeaponSlot].id,
          weaponSlot: activeWeaponSlot
        });
      } else if (input.weaponCycleDirection !== 0) {
        const nextWeaponSlot = clampWeaponSlot(activeWeaponSlot + input.weaponCycleDirection);

        if (nextWeaponSlot !== activeWeaponSlot) {
          activeWeaponSlot = nextWeaponSlot;
          events.push({
            timestampSeconds: currentTimeSeconds,
            type: "combat.weapon.changed",
            weaponId: COMBAT_WEAPON_ROSTER[activeWeaponSlot].id,
            weaponSlot: activeWeaponSlot
          });
        }
      }

      const activeWeapon = COMBAT_WEAPON_ROSTER[activeWeaponSlot];

      if (
        combatEnabled &&
        input.firePressed &&
        currentTimeSeconds - lastFireTimeSeconds >= activeWeapon.cooldownSeconds
      ) {
        lastFireTimeSeconds = currentTimeSeconds;
        shotCount += 1;
        events.push({
          impactSpeed: activeWeapon.impactSpeed,
          shotCount,
          timestampSeconds: currentTimeSeconds,
          type: "combat.weapon.fired",
          weaponId: activeWeapon.id
        });

        const shotResolution = resolveCombatShot({
          aim,
          targets,
          weapon: activeWeapon
        });

        if (shotResolution.hit) {
          hitCount += 1;
          targetCount += 1;
          events.push({
            distance: shotResolution.hit.distance,
            impactSpeed: activeWeapon.impactSpeed,
            shotCount,
            targetId: shotResolution.hit.target.id,
            targetKind: shotResolution.hit.target.kind,
            timestampSeconds: currentTimeSeconds,
            type: "combat.target.hit",
            weaponId: activeWeapon.id
          });
        }

        shotResolution.threatenedTargets.forEach((threat) => {
          targetCount += 1;
          events.push({
            distance: threat.distance,
            shotCount,
            targetId: threat.target.id,
            targetKind: threat.target.kind,
            timestampSeconds: currentTimeSeconds,
            type: "combat.target.threatened",
            weaponId: activeWeapon.id
          });
        });
      }

      recentEvents = appendRecentEvents(recentEvents, events);

      return events;
    }
  };
}
