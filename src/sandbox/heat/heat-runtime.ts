import type { CombatWeaponId } from "../combat/combat-runtime";
import type { VehicleDamageSeverity, VehicleImpactSourceType } from "../../vehicles/damage/vehicle-damage-system";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatStage = "calm" | "watch" | "elevated" | "high" | "critical";
export type HeatPursuitPhase = "none";
export type HeatEscapePhase = "inactive";

export interface CombatWeaponFiredHeatIncident {
  dedupeKey?: string;
  sourceId?: string;
  timestampSeconds: number;
  type: "combat.weapon.fired";
  weaponId: CombatWeaponId;
}

export interface PedestrianStruckHeatIncident {
  dedupeKey?: string;
  pedestrianId: string;
  sourceId?: string;
  timestampSeconds: number;
  type: "pedestrian.struck";
}

export interface PropBrokenHeatIncident {
  dedupeKey?: string;
  propId: string;
  sourceId?: string;
  timestampSeconds: number;
  type: "prop.broken";
}

export interface VehicleDamagedHeatIncident {
  dedupeKey?: string;
  severity: VehicleDamageSeverity;
  sourceId: string;
  sourceType: VehicleImpactSourceType;
  targetVehicleId: string;
  timestampSeconds: number;
  type: "vehicle.damaged";
}

export interface CombatWeaponChangedHeatIncident {
  sourceId?: string;
  timestampSeconds: number;
  type: "combat.weapon.changed";
  weaponId: CombatWeaponId;
  weaponSlot: number;
}

export interface PedestrianPanickedHeatIncident {
  pedestrianId: string;
  sourceId?: string;
  timestampSeconds: number;
  type: "pedestrian.panicked";
}

export type HeatScoredIncident =
  | CombatWeaponFiredHeatIncident
  | PedestrianStruckHeatIncident
  | PropBrokenHeatIncident
  | VehicleDamagedHeatIncident;

export type HeatIncident = HeatScoredIncident | CombatWeaponChangedHeatIncident | PedestrianPanickedHeatIncident;

export interface HeatRecentEventSnapshot {
  dedupeKey: string;
  incidentType: HeatScoredIncident["type"];
  levelAfter: HeatLevel;
  scoreAfter: number;
  scoreDelta: number;
  stageAfter: HeatStage;
  timestampSeconds: number;
}

export interface HeatRuntimeSnapshot {
  escapePhase: HeatEscapePhase;
  level: HeatLevel;
  maxScore: number;
  pursuitPhase: HeatPursuitPhase;
  recentEvents: HeatRecentEventSnapshot[];
  score: number;
  stage: HeatStage;
  stageThresholds: readonly [0, 8, 24, 48, 72];
}

export interface HeatIncidentRecordedEvent {
  incident: HeatRecentEventSnapshot;
  snapshot: HeatRuntimeSnapshot;
  type: "heat.incident.recorded";
}

export interface HeatLevelChangedEvent {
  nextLevel: HeatLevel;
  nextStage: HeatStage;
  previousLevel: HeatLevel;
  previousStage: HeatStage;
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.level.changed";
}

export type HeatEvent = HeatIncidentRecordedEvent | HeatLevelChangedEvent;

export interface HeatRuntime {
  getSnapshot(): HeatRuntimeSnapshot;
  record(incident: HeatIncident): HeatEvent[];
}

const MAX_HEAT_SCORE = 100;
const MAX_RECENT_HEAT_EVENTS = 4;
const HEAT_STAGE_THRESHOLDS = [0, 8, 24, 48, 72] as const;

const HEAT_STAGE_BY_LEVEL: Record<HeatLevel, HeatStage> = {
  0: "calm",
  1: "watch",
  2: "elevated",
  3: "high",
  4: "critical"
};

const HEAT_COOLDOWN_SECONDS: Record<HeatScoredIncident["type"], number> = {
  "combat.weapon.fired": 0.6,
  "pedestrian.struck": 1.5,
  "prop.broken": 5,
  "vehicle.damaged": 0.75
};

const VEHICLE_DAMAGE_HEAT: Record<VehicleDamageSeverity, number> = {
  heavy: 26,
  minor: 10,
  moderate: 16
};

function clampHeatScore(score: number): number {
  return Math.max(0, Math.min(MAX_HEAT_SCORE, Number.isFinite(score) ? score : 0));
}

function getHeatLevel(score: number): HeatLevel {
  if (score >= HEAT_STAGE_THRESHOLDS[4]) {
    return 4;
  }

  if (score >= HEAT_STAGE_THRESHOLDS[3]) {
    return 3;
  }

  if (score >= HEAT_STAGE_THRESHOLDS[2]) {
    return 2;
  }

  if (score >= HEAT_STAGE_THRESHOLDS[1]) {
    return 1;
  }

  return 0;
}

function isHeatIncidentScored(incident: HeatIncident): incident is HeatScoredIncident {
  return (
    incident.type === "combat.weapon.fired" ||
    incident.type === "pedestrian.struck" ||
    incident.type === "prop.broken" ||
    incident.type === "vehicle.damaged"
  );
}

function getHeatScoreDelta(incident: HeatScoredIncident): number {
  if (incident.type === "combat.weapon.fired") {
    return 8;
  }

  if (incident.type === "pedestrian.struck") {
    return 28;
  }

  if (incident.type === "prop.broken") {
    return 14;
  }

  return VEHICLE_DAMAGE_HEAT[incident.severity];
}

function createVehicleDamageDedupeKey(incident: VehicleDamagedHeatIncident): string {
  if (incident.sourceType === "vehicle") {
    const sortedPair = [incident.sourceId, incident.targetVehicleId].sort();

    return `vehicle.damaged:vehicle:${sortedPair[0]}:${sortedPair[1]}`;
  }

  return `vehicle.damaged:${incident.sourceType}:${incident.sourceId}:${incident.targetVehicleId}`;
}

function createHeatIncidentDedupeKey(incident: HeatScoredIncident): string {
  if (incident.dedupeKey) {
    return incident.dedupeKey;
  }

  if (incident.type === "combat.weapon.fired") {
    return `combat.weapon.fired:${incident.sourceId ?? incident.weaponId}`;
  }

  if (incident.type === "pedestrian.struck") {
    return `pedestrian.struck:${incident.pedestrianId}`;
  }

  if (incident.type === "prop.broken") {
    return `prop.broken:${incident.propId}`;
  }

  return createVehicleDamageDedupeKey(incident);
}

function createSnapshot(state: {
  recentEvents: HeatRecentEventSnapshot[];
  score: number;
}): HeatRuntimeSnapshot {
  const level = getHeatLevel(state.score);

  return {
    escapePhase: "inactive",
    level,
    maxScore: MAX_HEAT_SCORE,
    pursuitPhase: "none",
    recentEvents: [...state.recentEvents],
    score: state.score,
    stage: HEAT_STAGE_BY_LEVEL[level],
    stageThresholds: HEAT_STAGE_THRESHOLDS
  };
}

export function createHeatRuntime(): HeatRuntime {
  const acceptedIncidentTimes = new Map<string, number>();
  let score = 0;
  let recentEvents: HeatRecentEventSnapshot[] = [];

  return {
    getSnapshot: () => createSnapshot({ recentEvents, score }),
    record: (incident) => {
      if (!isHeatIncidentScored(incident)) {
        return [];
      }

      const dedupeKey = createHeatIncidentDedupeKey(incident);
      const previousAcceptedTime = acceptedIncidentTimes.get(dedupeKey) ?? Number.NEGATIVE_INFINITY;
      const cooldownSeconds = HEAT_COOLDOWN_SECONDS[incident.type];

      if (incident.timestampSeconds - previousAcceptedTime < cooldownSeconds) {
        return [];
      }

      acceptedIncidentTimes.set(dedupeKey, incident.timestampSeconds);

      const previousLevel = getHeatLevel(score);
      const previousStage = HEAT_STAGE_BY_LEVEL[previousLevel];
      const scoreDelta = getHeatScoreDelta(incident);

      score = clampHeatScore(score + scoreDelta);

      const nextLevel = getHeatLevel(score);
      const nextStage = HEAT_STAGE_BY_LEVEL[nextLevel];
      const recentEvent: HeatRecentEventSnapshot = {
        dedupeKey,
        incidentType: incident.type,
        levelAfter: nextLevel,
        scoreAfter: score,
        scoreDelta,
        stageAfter: nextStage,
        timestampSeconds: incident.timestampSeconds
      };

      recentEvents = [...recentEvents, recentEvent].slice(-MAX_RECENT_HEAT_EVENTS);

      const snapshot = createSnapshot({ recentEvents, score });
      const events: HeatEvent[] = [
        {
          incident: recentEvent,
          snapshot,
          type: "heat.incident.recorded"
        }
      ];

      if (nextLevel !== previousLevel) {
        events.push({
          nextLevel,
          nextStage,
          previousLevel,
          previousStage,
          snapshot,
          timestampSeconds: incident.timestampSeconds,
          type: "heat.level.changed"
        });
      }

      return events;
    }
  };
}
