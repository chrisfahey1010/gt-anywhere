import type { PedestrianEvent } from "../../pedestrians/runtime/pedestrian-system";
import {
  createHeatRuntime,
  type HeatEvent,
  type HeatRuntime,
  type HeatRuntimeSnapshot
} from "../../sandbox/heat/heat-runtime";
import type { CombatEvent } from "../../sandbox/combat/combat-runtime";
import type { ChaosSceneEvent } from "./chaos-scene-runtime";

export interface SceneHeatRuntime {
  dispose(): void;
  getSnapshot(): HeatRuntimeSnapshot;
}

export interface UpdateSceneHeatOptions {
  chaosEvents?: readonly ChaosSceneEvent[];
  combatEvents?: readonly CombatEvent[];
  currentTimeSeconds?: number;
  pedestrianEvents?: readonly PedestrianEvent[];
  runtime: SceneHeatRuntime;
}

export interface ApplyHeatSceneTelemetryOptions {
  canvas: HTMLCanvasElement;
  events: readonly HeatEvent[];
  runtime: SceneHeatRuntime;
  scene: {
    metadata?: unknown;
  };
}

interface RuntimeState extends SceneHeatRuntime {
  heatRuntime: HeatRuntime;
}

function recordCombatHeat(runtime: HeatRuntime, event: CombatEvent): HeatEvent[] {
  if (event.type !== "combat.weapon.fired") {
    return [];
  }

  return runtime.record({
    timestampSeconds: event.timestampSeconds,
    type: "combat.weapon.fired",
    weaponId: event.weaponId
  });
}

function recordPedestrianHeat(runtime: HeatRuntime, event: PedestrianEvent, timestampSeconds: number): HeatEvent[] {
  if (event.type !== "pedestrian.struck") {
    return [];
  }

  return runtime.record({
    pedestrianId: event.pedestrianId,
    sourceId: event.sourceId,
    timestampSeconds,
    type: "pedestrian.struck"
  });
}

function recordChaosHeat(runtime: HeatRuntime, event: ChaosSceneEvent, timestampSeconds: number): HeatEvent[] {
  if (event.type === "prop.broken") {
    return runtime.record({
      propId: event.propId,
      sourceId: event.sourceId,
      timestampSeconds,
      type: "prop.broken"
    });
  }

  return runtime.record({
    severity: event.damageState.severity,
    sourceId: event.sourceId,
    sourceType: event.sourceType,
    targetVehicleId: event.targetVehicleId,
    timestampSeconds,
    type: "vehicle.damaged"
  });
}

export function createSceneHeatRuntime(): SceneHeatRuntime {
  const heatRuntime = createHeatRuntime();

  return {
    dispose: () => {},
    getSnapshot: () => heatRuntime.getSnapshot(),
    heatRuntime
  } as RuntimeState;
}

export function disposeSceneHeatRuntime(runtime: SceneHeatRuntime | null): void {
  runtime?.dispose();
}

export function updateSceneHeat(options: UpdateSceneHeatOptions): HeatEvent[] {
  const runtime = options.runtime as RuntimeState;
  const currentTimeSeconds = options.currentTimeSeconds ?? 0;
  const heatEvents: HeatEvent[] = [];

  options.combatEvents?.forEach((event) => {
    // Downstream seams already translate target hits into struck, broken, and damaged events.
    heatEvents.push(...recordCombatHeat(runtime.heatRuntime, event));
  });
  options.pedestrianEvents?.forEach((event) => {
    heatEvents.push(...recordPedestrianHeat(runtime.heatRuntime, event, currentTimeSeconds));
  });
  options.chaosEvents?.forEach((event) => {
    heatEvents.push(...recordChaosHeat(runtime.heatRuntime, event, currentTimeSeconds));
  });

  return heatEvents;
}

export function applyHeatSceneTelemetry(options: ApplyHeatSceneTelemetryOptions): void {
  const snapshot = options.runtime.getSnapshot();
  const recentEventTypes = snapshot.recentEvents.map((event) => event.incidentType);
  const stageChanged = options.events.some((event) => event.type === "heat.level.changed");

  if (options.scene.metadata && typeof options.scene.metadata === "object") {
    Object.assign(options.scene.metadata, {
      heatEscapePhase: snapshot.escapePhase,
      heatLevel: snapshot.level,
      heatPursuitPhase: snapshot.pursuitPhase,
      heatRecentEvents: recentEventTypes,
      heatScore: snapshot.score,
      heatStage: snapshot.stage,
      heatStageChanged: stageChanged
    });
  }

  options.canvas.dataset.heatEscapePhase = snapshot.escapePhase;
  options.canvas.dataset.heatLevel = String(snapshot.level);
  options.canvas.dataset.heatPursuitPhase = snapshot.pursuitPhase;
  options.canvas.dataset.heatRecentEvents = recentEventTypes.join(",");
  options.canvas.dataset.heatScore = String(snapshot.score);
  options.canvas.dataset.heatStage = snapshot.stage;
  options.canvas.dataset.heatStageChanged = String(stageChanged);
}
