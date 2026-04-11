import type { CombatWeaponId } from "../combat/combat-runtime";
import {
  HEAT_CAPTURE_SECONDS,
  HEAT_CONTACT_LOSS_SECONDS,
  HEAT_ESCAPE_COOLDOWN_SECONDS,
  HEAT_PURSUIT_DISPATCH_SECONDS,
  HEAT_RESPONDER_COUNT_BY_LEVEL,
  HEAT_SCORE_DECAY_PER_SECOND
} from "./heat-pursuit-config";
import type { VehicleDamageSeverity, VehicleImpactSourceType } from "../../vehicles/damage/vehicle-damage-system";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;
export type HeatStage = "calm" | "watch" | "elevated" | "high" | "critical";
export type HeatPursuitPhase = "none" | "dispatching" | "active" | "capturing";
export type HeatEscapePhase = "inactive" | "breaking-contact" | "cooldown" | "cleared";
export type HeatFailSignal = "capture" | null;
export type HeatPursuitContact = "unknown" | "direct" | "broken";

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
  captureTimeRemainingSeconds: number | null;
  escapeCooldownRemainingSeconds: number;
  escapePhase: HeatEscapePhase;
  failSignal: HeatFailSignal;
  level: HeatLevel;
  maxScore: number;
  pursuitPhase: HeatPursuitPhase;
  recentEvents: HeatRecentEventSnapshot[];
  responderCount: number;
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

export interface HeatPursuitStartedEvent {
  responderCount: number;
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.pursuit.started";
}

export interface HeatPursuitContactLostEvent {
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.pursuit.contact.lost";
}

export interface HeatEscapeCooldownStartedEvent {
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.escape.cooldown.started";
}

export interface HeatPursuitClearedEvent {
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.pursuit.cleared";
}

export interface HeatFailSignaledEvent {
  reason: "capture";
  snapshot: HeatRuntimeSnapshot;
  timestampSeconds: number;
  type: "heat.fail.signaled";
}

export type HeatEvent =
  | HeatEscapeCooldownStartedEvent
  | HeatFailSignaledEvent
  | HeatIncidentRecordedEvent
  | HeatLevelChangedEvent
  | HeatPursuitClearedEvent
  | HeatPursuitContactLostEvent
  | HeatPursuitStartedEvent;

export interface HeatRuntimeAdvanceOptions {
  currentTimeSeconds: number;
  pursuitContact?: HeatPursuitContact;
  responderCount?: number;
}

export interface HeatRuntime {
  advance(options: HeatRuntimeAdvanceOptions): HeatEvent[];
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
  captureTimeRemainingSeconds: number | null;
  escapeCooldownRemainingSeconds: number;
  escapePhase: HeatEscapePhase;
  failSignal: HeatFailSignal;
  pursuitPhase: HeatPursuitPhase;
  recentEvents: HeatRecentEventSnapshot[];
  responderCount: number;
  score: number;
}): HeatRuntimeSnapshot {
  const level = getHeatLevel(state.score);

  return {
    captureTimeRemainingSeconds: state.captureTimeRemainingSeconds,
    escapeCooldownRemainingSeconds: state.escapeCooldownRemainingSeconds,
    escapePhase: state.escapePhase,
    failSignal: state.failSignal,
    level,
    maxScore: MAX_HEAT_SCORE,
    pursuitPhase: state.pursuitPhase,
    recentEvents: [...state.recentEvents],
    responderCount: state.responderCount,
    score: state.score,
    stage: HEAT_STAGE_BY_LEVEL[level],
    stageThresholds: HEAT_STAGE_THRESHOLDS
  };
}

function createLevelChangedEvent(options: {
  previousScore: number;
  nextScore: number;
  recentEvents: HeatRecentEventSnapshot[];
  pursuitPhase: HeatPursuitPhase;
  escapePhase: HeatEscapePhase;
  responderCount: number;
  captureTimeRemainingSeconds: number | null;
  escapeCooldownRemainingSeconds: number;
  failSignal: HeatFailSignal;
  timestampSeconds: number;
}): HeatLevelChangedEvent | null {
  const previousLevel = getHeatLevel(options.previousScore);
  const nextLevel = getHeatLevel(options.nextScore);

  if (previousLevel === nextLevel) {
    return null;
  }

  const snapshot = createSnapshot({
    captureTimeRemainingSeconds: options.captureTimeRemainingSeconds,
    escapeCooldownRemainingSeconds: options.escapeCooldownRemainingSeconds,
    escapePhase: options.escapePhase,
    failSignal: options.failSignal,
    pursuitPhase: options.pursuitPhase,
    recentEvents: options.recentEvents,
    responderCount: options.responderCount,
    score: options.nextScore
  });

  return {
    nextLevel,
    nextStage: HEAT_STAGE_BY_LEVEL[nextLevel],
    previousLevel,
    previousStage: HEAT_STAGE_BY_LEVEL[previousLevel],
    snapshot,
    timestampSeconds: options.timestampSeconds,
    type: "heat.level.changed"
  };
}

function getResponderCountForLevel(level: HeatLevel): number {
  return HEAT_RESPONDER_COUNT_BY_LEVEL[level];
}

export function createHeatRuntime(): HeatRuntime {
  const acceptedIncidentTimes = new Map<string, number>();
  let captureTimeRemainingSeconds: number | null = null;
  let cooldownStartedAtSeconds: number | null = null;
  let directPressureStartedAtSeconds: number | null = null;
  let escapeCooldownRemainingSeconds = 0;
  let escapePhase: HeatEscapePhase = "inactive";
  let failSignal: HeatFailSignal = null;
  let lastAdvanceTimeSeconds: number | null = null;
  let pursuitRequested = false;
  let pursuitPhase: HeatPursuitPhase = "none";
  let pursuitStartedAtSeconds: number | null = null;
  let recentEvents: HeatRecentEventSnapshot[] = [];
  let responderCount = 0;
  let score = 0;

  const getSnapshot = (): HeatRuntimeSnapshot =>
    createSnapshot({
      captureTimeRemainingSeconds,
      escapeCooldownRemainingSeconds,
      escapePhase,
      failSignal,
      pursuitPhase,
      recentEvents,
      responderCount,
      score
    });

  const syncResponderCount = (explicitResponderCount?: number): void => {
    const cappedExplicitResponderCount = Math.max(0, Math.floor(explicitResponderCount ?? Number.NaN));
    const targetResponderCount = getResponderCountForLevel(getHeatLevel(score));

    if (Number.isFinite(cappedExplicitResponderCount)) {
      responderCount = cappedExplicitResponderCount;
      return;
    }

    responderCount = pursuitPhase === "none" ? 0 : targetResponderCount;
  };

  return {
    advance: ({ currentTimeSeconds, pursuitContact = "unknown", responderCount: explicitResponderCount }) => {
      const events: HeatEvent[] = [];
      const nextTimeSeconds = Number.isFinite(currentTimeSeconds)
        ? currentTimeSeconds
        : (lastAdvanceTimeSeconds ?? 0);

      syncResponderCount(explicitResponderCount);

      if (pursuitRequested && score > 0 && pursuitPhase === "none") {
        pursuitRequested = false;
        pursuitPhase = "dispatching";
        escapePhase = "inactive";
        failSignal = null;
        pursuitStartedAtSeconds = nextTimeSeconds;
        directPressureStartedAtSeconds = null;
        cooldownStartedAtSeconds = null;
        captureTimeRemainingSeconds = null;
        escapeCooldownRemainingSeconds = 0;
        syncResponderCount(explicitResponderCount);

        events.push({
          responderCount,
          snapshot: getSnapshot(),
          timestampSeconds: nextTimeSeconds,
          type: "heat.pursuit.started"
        });
      }

      if (
        pursuitPhase === "dispatching" &&
        pursuitStartedAtSeconds !== null &&
        nextTimeSeconds - pursuitStartedAtSeconds >= HEAT_PURSUIT_DISPATCH_SECONDS
      ) {
        pursuitPhase = "active";
      }

      if (pursuitPhase === "active") {
        if (pursuitContact === "direct") {
          escapePhase = "inactive";
          cooldownStartedAtSeconds = null;
          escapeCooldownRemainingSeconds = 0;
          directPressureStartedAtSeconds ??= nextTimeSeconds;
          captureTimeRemainingSeconds = Math.max(
            0,
            HEAT_CAPTURE_SECONDS - (nextTimeSeconds - directPressureStartedAtSeconds)
          );

          if (captureTimeRemainingSeconds === 0 && failSignal === null) {
            pursuitPhase = "capturing";
            failSignal = "capture";
            events.push({
              reason: "capture",
              snapshot: getSnapshot(),
              timestampSeconds: nextTimeSeconds,
              type: "heat.fail.signaled"
            });
          }
        } else if (pursuitContact === "broken") {
          directPressureStartedAtSeconds = null;
          captureTimeRemainingSeconds = null;

          if (escapePhase === "inactive") {
            escapePhase = "breaking-contact";
            pursuitStartedAtSeconds = nextTimeSeconds;
            events.push({
              snapshot: getSnapshot(),
              timestampSeconds: nextTimeSeconds,
              type: "heat.pursuit.contact.lost"
            });
          }

          if (
            escapePhase === "breaking-contact" &&
            pursuitStartedAtSeconds !== null &&
            nextTimeSeconds - pursuitStartedAtSeconds >= HEAT_CONTACT_LOSS_SECONDS
          ) {
            escapePhase = "cooldown";
            cooldownStartedAtSeconds = nextTimeSeconds;
            escapeCooldownRemainingSeconds = HEAT_ESCAPE_COOLDOWN_SECONDS;
            events.push({
              snapshot: getSnapshot(),
              timestampSeconds: nextTimeSeconds,
              type: "heat.escape.cooldown.started"
            });
          }

          if (escapePhase === "cooldown" && cooldownStartedAtSeconds !== null) {
            escapeCooldownRemainingSeconds = Math.max(
              0,
              HEAT_ESCAPE_COOLDOWN_SECONDS - (nextTimeSeconds - cooldownStartedAtSeconds)
            );

            if (escapeCooldownRemainingSeconds === 0) {
              pursuitPhase = "none";
              escapePhase = "cleared";
              responderCount = 0;
              events.push({
                snapshot: getSnapshot(),
                timestampSeconds: nextTimeSeconds,
                type: "heat.pursuit.cleared"
              });
            }
          }
        } else {
          directPressureStartedAtSeconds = null;
          captureTimeRemainingSeconds = null;

          if (escapePhase === "cooldown" && cooldownStartedAtSeconds !== null) {
            escapeCooldownRemainingSeconds = Math.max(
              0,
              HEAT_ESCAPE_COOLDOWN_SECONDS - (nextTimeSeconds - cooldownStartedAtSeconds)
            );
          }
        }
      } else if (pursuitPhase === "capturing") {
        captureTimeRemainingSeconds = 0;
      } else {
        directPressureStartedAtSeconds = null;
        captureTimeRemainingSeconds = null;
      }

      const previousScore = score;

      if ((escapePhase === "cooldown" || pursuitPhase === "none") && lastAdvanceTimeSeconds !== null) {
        score = clampHeatScore(score - (nextTimeSeconds - lastAdvanceTimeSeconds) * HEAT_SCORE_DECAY_PER_SECOND);
      }

      syncResponderCount(explicitResponderCount);

      const levelChangedEvent = createLevelChangedEvent({
        captureTimeRemainingSeconds,
        escapeCooldownRemainingSeconds,
        escapePhase,
        failSignal,
        nextScore: score,
        previousScore,
        pursuitPhase,
        recentEvents,
        responderCount,
        timestampSeconds: nextTimeSeconds
      });

      if (levelChangedEvent !== null) {
        events.push(levelChangedEvent);
      }

      lastAdvanceTimeSeconds = nextTimeSeconds;

      return events;
    },
    getSnapshot,
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

      const previousScore = score;
      const scoreDelta = getHeatScoreDelta(incident);

      score = clampHeatScore(score + scoreDelta);
      pursuitRequested = score > 0;
      failSignal = null;

      if (escapePhase === "cleared") {
        escapePhase = "inactive";
      }

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
      syncResponderCount();

      const snapshot = getSnapshot();
      const events: HeatEvent[] = [
        {
          incident: recentEvent,
          snapshot,
          type: "heat.incident.recorded"
        }
      ];

      const levelChangedEvent = createLevelChangedEvent({
        captureTimeRemainingSeconds,
        escapeCooldownRemainingSeconds,
        escapePhase,
        failSignal,
        nextScore: score,
        previousScore,
        pursuitPhase,
        recentEvents,
        responderCount,
        timestampSeconds: incident.timestampSeconds
      });

      if (levelChangedEvent !== null) {
        events.push(levelChangedEvent);
      }

      return events;
    }
  };
}
