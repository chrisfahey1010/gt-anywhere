import type { HeatRuntimeSnapshot } from "../heat/heat-runtime";
import type { VehicleDamageState } from "../../vehicles/damage/vehicle-damage-policy";

export type RunOutcome = "BUSTED" | "WRECKED";
export type RunOutcomePhase = "none" | "recovery-window" | "showing-outcome" | "restart-pending";

export interface RunOutcomeSnapshot {
  outcome: RunOutcome | null;
  outcomeTimeRemainingSeconds: number | null;
  phase: RunOutcomePhase;
  recoveryTimeRemainingSeconds: number | null;
}

export interface RunOutcomeChangedEvent {
  snapshot: RunOutcomeSnapshot;
  timestampSeconds: number;
  type: "run.outcome.changed";
}

export interface RunOutcomeRestartRequestedEvent {
  outcome: RunOutcome;
  snapshot: RunOutcomeSnapshot;
  timestampSeconds: number;
  type: "run.outcome.restart.requested";
}

export type RunOutcomeEvent = RunOutcomeChangedEvent | RunOutcomeRestartRequestedEvent;

export interface RunOutcomeRuntimeUpdateOptions {
  activeVehicleDamage: VehicleDamageState;
  currentTimeSeconds: number;
  hasRecoveryVehicle: boolean;
  heatSnapshot: HeatRuntimeSnapshot;
  possessionMode: "vehicle" | "on-foot";
}

export interface RunOutcomeRuntime {
  getSnapshot(): RunOutcomeSnapshot;
  reset(): void;
  update(options: RunOutcomeRuntimeUpdateOptions): RunOutcomeEvent[];
}

const RUN_OUTCOME_DISPLAY_SECONDS = 2;
const RUN_OUTCOME_WRECKED_RECOVERY_SECONDS = 4;

export function createRunOutcomeRuntime(): RunOutcomeRuntime {
  let outcome: RunOutcome | null = null;
  let outcomeStartedAtSeconds: number | null = null;
  let phase: RunOutcomePhase = "none";
  let recoveryStartedAtSeconds: number | null = null;

  const getSnapshotForTime = (currentTimeSeconds: number): RunOutcomeSnapshot => ({
    outcome,
    outcomeTimeRemainingSeconds:
      phase === "showing-outcome" && outcomeStartedAtSeconds !== null
        ? Math.max(0, RUN_OUTCOME_DISPLAY_SECONDS - (currentTimeSeconds - outcomeStartedAtSeconds))
        : null,
    phase,
    recoveryTimeRemainingSeconds:
      phase === "recovery-window" && recoveryStartedAtSeconds !== null
        ? Math.max(0, RUN_OUTCOME_WRECKED_RECOVERY_SECONDS - (currentTimeSeconds - recoveryStartedAtSeconds))
        : null
  });

  const createChangedEvent = (currentTimeSeconds: number): RunOutcomeChangedEvent => ({
    snapshot: getSnapshotForTime(currentTimeSeconds),
    timestampSeconds: currentTimeSeconds,
    type: "run.outcome.changed"
  });

  return {
    getSnapshot: () => getSnapshotForTime(outcomeStartedAtSeconds ?? recoveryStartedAtSeconds ?? 0),
    reset: () => {
      outcome = null;
      outcomeStartedAtSeconds = null;
      phase = "none";
      recoveryStartedAtSeconds = null;
    },
    update: ({ activeVehicleDamage, currentTimeSeconds, hasRecoveryVehicle, heatSnapshot, possessionMode }) => {
      const events: RunOutcomeEvent[] = [];

      if (heatSnapshot.failSignal === "capture" && outcome !== "BUSTED") {
        outcome = "BUSTED";
        outcomeStartedAtSeconds = currentTimeSeconds;
        phase = "showing-outcome";
        recoveryStartedAtSeconds = null;
        events.push(createChangedEvent(currentTimeSeconds));
        return events;
      }

      if (phase === "none") {
        if (activeVehicleDamage.normalizedSeverity >= 1) {
          phase = "recovery-window";
          recoveryStartedAtSeconds = currentTimeSeconds;
          events.push(createChangedEvent(currentTimeSeconds));
          return events;
        }
      }

      if (phase === "recovery-window") {
        const recoveredVehicleControl =
          hasRecoveryVehicle && possessionMode === "vehicle" && activeVehicleDamage.normalizedSeverity < 1;

        if (recoveredVehicleControl) {
          recoveryStartedAtSeconds = null;
          phase = "none";
          events.push(createChangedEvent(currentTimeSeconds));
          return events;
        }

        if (
          recoveryStartedAtSeconds !== null &&
          currentTimeSeconds - recoveryStartedAtSeconds >= RUN_OUTCOME_WRECKED_RECOVERY_SECONDS
        ) {
          outcome = "WRECKED";
          outcomeStartedAtSeconds = currentTimeSeconds;
          phase = "showing-outcome";
          recoveryStartedAtSeconds = null;
          events.push(createChangedEvent(currentTimeSeconds));
          return events;
        }
      }

      if (
        phase === "showing-outcome" &&
        outcome !== null &&
        outcomeStartedAtSeconds !== null &&
        currentTimeSeconds - outcomeStartedAtSeconds >= RUN_OUTCOME_DISPLAY_SECONDS
      ) {
        phase = "restart-pending";
        events.push({
          outcome,
          snapshot: getSnapshotForTime(currentTimeSeconds),
          timestampSeconds: currentTimeSeconds,
          type: "run.outcome.restart.requested"
        });
      }

      return events;
    }
  };
}
