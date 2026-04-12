import { describe, expect, it, vi } from "vitest";
import { createWorldAudioRuntime } from "../../src/audio/world-audio-runtime";
import type { HeatRuntimeSnapshot } from "../../src/sandbox/heat/heat-runtime";

class FakeGainNode {
  readonly gain = {
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    value: 0
  };

  connect = vi.fn();

  disconnect = vi.fn();
}

class FakeOscillatorNode {
  readonly frequency = {
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    value: 0
  };

  type = "sine";

  connect = vi.fn();

  disconnect = vi.fn();

  start = vi.fn();

  stop = vi.fn();
}

class FakeAudioContext {
  readonly currentTime = 0;

  readonly destination = {};

  state: "running" | "suspended" = "suspended";

  createGain(): FakeGainNode {
    return new FakeGainNode();
  }

  createOscillator(): FakeOscillatorNode {
    return new FakeOscillatorNode();
  }

  close = vi.fn(async () => undefined);

  resume = vi.fn(async () => {
    this.state = "running";
  });
}

function createHeatSnapshot(overrides: Partial<HeatRuntimeSnapshot> = {}): HeatRuntimeSnapshot {
  return {
    captureTimeRemainingSeconds: null,
    escapeCooldownRemainingSeconds: 0,
    escapePhase: "inactive",
    failSignal: null,
    level: 0,
    maxScore: 100,
    pursuitPhase: "none",
    recentEvents: [],
    responderCount: 0,
    score: 0,
    stage: "calm",
    stageThresholds: [0, 8, 24, 48, 72],
    ...overrides
  };
}

describe("world audio runtime", () => {
  it("fails soft when no browser audio backend is available", async () => {
    const runtime = createWorldAudioRuntime({ createContext: null });

    await expect(runtime.unlock()).resolves.toBeUndefined();
    expect(runtime.getTelemetry()).toMatchObject({
      available: false,
      unlockState: "unsupported"
    });
  });

  it("treats blocked context resume as recoverable instead of throwing", async () => {
    const context = new FakeAudioContext();

    context.resume = vi.fn(async () => {
      throw new Error("blocked");
    });

    const runtime = createWorldAudioRuntime({
      createContext: () => context
    });

    await expect(runtime.unlock()).resolves.toBeUndefined();
    expect(runtime.getTelemetry()).toMatchObject({
      available: true,
      unlockState: "blocked"
    });
  });

  it("tracks vehicle presence, world mood, and event cues after unlock", async () => {
    const runtime = createWorldAudioRuntime({
      createContext: () => new FakeAudioContext()
    });

    await runtime.unlock();
    runtime.setPolishProfile({
      ambienceEnabled: false,
      cueVolumeScale: 0.75,
      profile: "low",
      vehicleHumEnabled: true
    });
    runtime.setWorldState({
      activeVehicleType: "sedan",
      possessionMode: "vehicle",
      worldReady: true
    });
    runtime.handleHeat({
      events: [
        {
          nextLevel: 2,
          nextStage: "elevated",
          previousLevel: 0,
          previousStage: "calm",
          snapshot: createHeatSnapshot({ level: 2, responderCount: 1, score: 24, stage: "elevated" }),
          timestampSeconds: 3,
          type: "heat.level.changed"
        }
      ],
      snapshot: createHeatSnapshot({ level: 2, responderCount: 1, score: 24, stage: "elevated" })
    });
    runtime.handleCombatEvents([
      {
        impactSpeed: 8.5,
        shotCount: 1,
        timestampSeconds: 3,
        type: "combat.weapon.fired",
        weaponId: "sidearm"
      }
    ]);
    runtime.handleChaosEventTypes(["vehicle.damaged"]);

    expect(runtime.getTelemetry()).toMatchObject({
      ambienceEnabled: false,
      available: true,
      cueCount: 3,
      lastCue: "impact.vehicle",
      mood: "elevated",
      profile: "low",
      unlockState: "unlocked",
      vehiclePresence: "sedan"
    });
  });
});
