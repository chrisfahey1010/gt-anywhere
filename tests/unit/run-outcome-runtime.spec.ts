import { describe, expect, it } from "vitest";
import { createPristineVehicleDamageState } from "../../src/vehicles/damage/vehicle-damage-policy";
import type { HeatRuntimeSnapshot } from "../../src/sandbox/heat/heat-runtime";
import { createRunOutcomeRuntime } from "../../src/sandbox/reset/run-outcome-runtime";

function createHeatSnapshot(overrides: Partial<HeatRuntimeSnapshot> = {}): HeatRuntimeSnapshot {
  return {
    captureTimeRemainingSeconds: null,
    escapeCooldownRemainingSeconds: 0,
    escapePhase: "inactive",
    failSignal: null,
    level: 2,
    maxScore: 100,
    pursuitPhase: "active",
    recentEvents: [],
    responderCount: 1,
    score: 32,
    stage: "elevated",
    stageThresholds: [0, 8, 24, 48, 72],
    ...overrides
  };
}

describe("run outcome runtime", () => {
  it("signals BUSTED from sustained capture and requests restart after the short outcome window", () => {
    const runtime = createRunOutcomeRuntime();

    expect(
      runtime
        .update({
          activeVehicleDamage: createPristineVehicleDamageState(),
          currentTimeSeconds: 1,
          hasRecoveryVehicle: true,
          heatSnapshot: createHeatSnapshot({ failSignal: "capture", pursuitPhase: "capturing" }),
          possessionMode: "vehicle"
        })
        .map((event) => event.type)
    ).toContain("run.outcome.changed");
    expect(runtime.getSnapshot()).toMatchObject({
      outcome: "BUSTED",
      phase: "showing-outcome"
    });

    expect(
      runtime
        .update({
          activeVehicleDamage: createPristineVehicleDamageState(),
          currentTimeSeconds: 3,
          hasRecoveryVehicle: true,
          heatSnapshot: createHeatSnapshot({ failSignal: "capture", pursuitPhase: "capturing" }),
          possessionMode: "vehicle"
        })
        .map((event) => event.type)
    ).toContain("run.outcome.restart.requested");
    expect(runtime.getSnapshot()).toMatchObject({
      outcome: "BUSTED",
      phase: "restart-pending"
    });
  });

  it("starts a wrecked recovery window and only resolves WRECKED if the player fails to recover in time", () => {
    const runtime = createRunOutcomeRuntime();

    expect(
      runtime
        .update({
          activeVehicleDamage: {
            accumulatedDamage: 100,
            normalizedSeverity: 1
          },
          currentTimeSeconds: 1,
          hasRecoveryVehicle: true,
          heatSnapshot: createHeatSnapshot(),
          possessionMode: "on-foot"
        })
        .map((event) => event.type)
    ).toContain("run.outcome.changed");
    expect(runtime.getSnapshot()).toMatchObject({
      outcome: null,
      phase: "recovery-window"
    });

    runtime.update({
      activeVehicleDamage: {
        accumulatedDamage: 12,
        normalizedSeverity: 0.12
      },
      currentTimeSeconds: 2,
      hasRecoveryVehicle: true,
      heatSnapshot: createHeatSnapshot(),
      possessionMode: "vehicle"
    });
    expect(runtime.getSnapshot()).toMatchObject({
      outcome: null,
      phase: "none"
    });

    const failedRecoveryRuntime = createRunOutcomeRuntime();

    failedRecoveryRuntime.update({
      activeVehicleDamage: {
        accumulatedDamage: 100,
        normalizedSeverity: 1
      },
      currentTimeSeconds: 1,
      hasRecoveryVehicle: true,
      heatSnapshot: createHeatSnapshot(),
      possessionMode: "on-foot"
    });

    expect(
      failedRecoveryRuntime
        .update({
          activeVehicleDamage: {
            accumulatedDamage: 100,
            normalizedSeverity: 1
          },
          currentTimeSeconds: 5,
          hasRecoveryVehicle: true,
          heatSnapshot: createHeatSnapshot(),
          possessionMode: "on-foot"
        })
        .map((event) => event.type)
    ).toContain("run.outcome.changed");
    expect(failedRecoveryRuntime.getSnapshot()).toMatchObject({
      outcome: "WRECKED",
      phase: "showing-outcome"
    });
  });

  it("promotes an active recovery window to BUSTED when pursuit capture succeeds first", () => {
    const runtime = createRunOutcomeRuntime();

    runtime.update({
      activeVehicleDamage: {
        accumulatedDamage: 100,
        normalizedSeverity: 1
      },
      currentTimeSeconds: 1,
      hasRecoveryVehicle: true,
      heatSnapshot: createHeatSnapshot(),
      possessionMode: "on-foot"
    });

    expect(
      runtime
        .update({
          activeVehicleDamage: {
            accumulatedDamage: 100,
            normalizedSeverity: 1
          },
          currentTimeSeconds: 2,
          hasRecoveryVehicle: true,
          heatSnapshot: createHeatSnapshot({ failSignal: "capture", pursuitPhase: "capturing" }),
          possessionMode: "on-foot"
        })
        .map((event) => event.type)
    ).toContain("run.outcome.changed");
    expect(runtime.getSnapshot()).toMatchObject({
      outcome: "BUSTED",
      phase: "showing-outcome"
    });
  });
});
