import type { AudioPolishProfile } from "../app/config/platform";
import type { CombatEvent } from "../sandbox/combat/combat-runtime";
import type { HeatEvent, HeatRuntimeSnapshot, HeatStage } from "../sandbox/heat/heat-runtime";

type WorldAudioCueName =
  | "combat.fire"
  | "combat.hit"
  | "heat.level"
  | "heat.pursuit"
  | "impact.prop"
  | "impact.vehicle"
  | "none";

export type WorldAudioUnlockState = "blocked" | "uninitialized" | "unlocked" | "unsupported";
export type WorldAudioMood = HeatStage | "inactive";

interface AudioParamLike {
  linearRampToValueAtTime(value: number, endTime: number): void;
  setTargetAtTime(value: number, startTime: number, timeConstant: number): void;
  setValueAtTime(value: number, startTime: number): void;
  value: number;
}

interface GainNodeLike {
  connect(destination: unknown): void;
  disconnect?(): void;
  gain: AudioParamLike;
}

interface OscillatorNodeLike {
  connect(destination: unknown): void;
  disconnect?(): void;
  frequency: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
  type: OscillatorType | string;
}

export interface WorldAudioContextLike {
  close?(): Promise<void>;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  currentTime: number;
  destination: unknown;
  resume?(): Promise<void>;
  state: string;
}

export interface WorldAudioTelemetry {
  ambienceEnabled: boolean;
  available: boolean;
  cueCount: number;
  lastCue: WorldAudioCueName;
  mood: WorldAudioMood;
  profile: AudioPolishProfile["profile"];
  unlockState: WorldAudioUnlockState;
  vehiclePresence: string;
}

export interface WorldAudioRuntime {
  dispose(): void;
  getTelemetry(): WorldAudioTelemetry;
  handleChaosEventTypes(eventTypes: readonly string[]): void;
  handleCombatEvents(events: readonly CombatEvent[]): void;
  handleHeat(options: { events: readonly HeatEvent[]; snapshot: HeatRuntimeSnapshot }): void;
  onTelemetryChanged(listener: (telemetry: WorldAudioTelemetry) => void): () => void;
  resetWorld(): void;
  setPolishProfile(profile: AudioPolishProfile): void;
  setWorldState(state: {
    activeVehicleType: string | null;
    possessionMode: "vehicle" | "on-foot" | null;
    worldReady: boolean;
  }): void;
  unlock(): Promise<void>;
}

export interface CreateWorldAudioRuntimeOptions {
  createContext?: (() => WorldAudioContextLike | null) | null;
}

const AMBIENCE_FREQUENCY_BY_MOOD: Record<WorldAudioMood, number> = {
  calm: 96,
  critical: 152,
  elevated: 122,
  high: 138,
  inactive: 96,
  watch: 108
};

const AMBIENCE_GAIN_BY_MOOD: Record<WorldAudioMood, number> = {
  calm: 0.012,
  critical: 0.028,
  elevated: 0.018,
  high: 0.024,
  inactive: 0,
  watch: 0.014
};

const VEHICLE_FREQUENCY_BY_TYPE: Record<string, number> = {
  "heavy-truck": 58,
  sedan: 74,
  "sports-car": 92
};

function createDefaultContextFactory(): (() => WorldAudioContextLike | null) | null {
  if (typeof window === "undefined") {
    return null;
  }

  const audioConstructor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!audioConstructor) {
    return null;
  }

  return () => new audioConstructor();
}

function resolveVehicleFrequency(vehicleType: string | null): number {
  if (vehicleType === null) {
    return VEHICLE_FREQUENCY_BY_TYPE.sedan;
  }

  return VEHICLE_FREQUENCY_BY_TYPE[vehicleType] ?? VEHICLE_FREQUENCY_BY_TYPE.sedan;
}

export function createWorldAudioRuntime(options: CreateWorldAudioRuntimeOptions = {}): WorldAudioRuntime {
  const listeners = new Set<(telemetry: WorldAudioTelemetry) => void>();
  const createContext = options.createContext === undefined ? createDefaultContextFactory() : options.createContext;
  let audioContext: WorldAudioContextLike | null = null;
  let masterGain: GainNodeLike | null = null;
  let ambienceGain: GainNodeLike | null = null;
  let ambienceOscillator: OscillatorNodeLike | null = null;
  let vehicleGain: GainNodeLike | null = null;
  let vehicleOscillator: OscillatorNodeLike | null = null;
  let latestHeatSnapshot: HeatRuntimeSnapshot | null = null;
  let polishProfile: AudioPolishProfile = {
    ambienceEnabled: true,
    cueVolumeScale: 0.9,
    profile: "medium",
    vehicleHumEnabled: true
  };
  let worldState: Parameters<WorldAudioRuntime["setWorldState"]>[0] = {
    activeVehicleType: null,
    possessionMode: null,
    worldReady: false
  };
  let telemetry: WorldAudioTelemetry = {
    ambienceEnabled: polishProfile.ambienceEnabled,
    available: createContext !== null,
    cueCount: 0,
    lastCue: "none",
    mood: "inactive",
    profile: polishProfile.profile,
    unlockState: createContext === null ? "unsupported" : "uninitialized",
    vehiclePresence: "none"
  };

  const notify = (): void => {
    const snapshot = { ...telemetry };

    listeners.forEach((listener) => {
      listener(snapshot);
    });
  };

  const setTelemetry = (changes: Partial<WorldAudioTelemetry>): void => {
    const nextTelemetry = {
      ...telemetry,
      ...changes
    };

    if (
      nextTelemetry.available === telemetry.available &&
      nextTelemetry.ambienceEnabled === telemetry.ambienceEnabled &&
      nextTelemetry.cueCount === telemetry.cueCount &&
      nextTelemetry.lastCue === telemetry.lastCue &&
      nextTelemetry.mood === telemetry.mood &&
      nextTelemetry.profile === telemetry.profile &&
      nextTelemetry.unlockState === telemetry.unlockState &&
      nextTelemetry.vehiclePresence === telemetry.vehiclePresence
    ) {
      return;
    }

    telemetry = nextTelemetry;
    notify();
  };

  const getResolvedMood = (): WorldAudioMood => {
    if (!worldState.worldReady) {
      return "inactive";
    }

    return latestHeatSnapshot?.stage ?? "calm";
  };

  const getVehiclePresence = (): string => {
    if (!worldState.worldReady || worldState.possessionMode !== "vehicle") {
      return "none";
    }

    return worldState.activeVehicleType ?? "vehicle";
  };

  const ensureAudioGraph = (): boolean => {
    if (audioContext === null) {
      return false;
    }

    if (masterGain !== null && ambienceGain !== null && ambienceOscillator !== null && vehicleGain !== null && vehicleOscillator !== null) {
      return true;
    }

    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.18, audioContext.currentTime);
    masterGain.connect(audioContext.destination);

    ambienceGain = audioContext.createGain();
    ambienceGain.gain.setValueAtTime(0, audioContext.currentTime);
    ambienceGain.connect(masterGain);
    ambienceOscillator = audioContext.createOscillator();
    ambienceOscillator.type = "triangle";
    ambienceOscillator.frequency.setValueAtTime(AMBIENCE_FREQUENCY_BY_MOOD.calm, audioContext.currentTime);
    ambienceOscillator.connect(ambienceGain);
    ambienceOscillator.start();

    vehicleGain = audioContext.createGain();
    vehicleGain.gain.setValueAtTime(0, audioContext.currentTime);
    vehicleGain.connect(masterGain);
    vehicleOscillator = audioContext.createOscillator();
    vehicleOscillator.type = "sawtooth";
    vehicleOscillator.frequency.setValueAtTime(resolveVehicleFrequency(worldState.activeVehicleType), audioContext.currentTime);
    vehicleOscillator.connect(vehicleGain);
    vehicleOscillator.start();

    return true;
  };

  const syncContinuousVoices = (): void => {
    const mood = getResolvedMood();
    const vehiclePresence = getVehiclePresence();

    setTelemetry({
      ambienceEnabled: polishProfile.ambienceEnabled,
      mood,
      profile: polishProfile.profile,
      vehiclePresence
    });

    if (
      audioContext === null ||
      telemetry.unlockState !== "unlocked" ||
      !ensureAudioGraph() ||
      ambienceGain === null ||
      ambienceOscillator === null ||
      vehicleGain === null ||
      vehicleOscillator === null
    ) {
      return;
    }

    ambienceGain.gain.setTargetAtTime(
      polishProfile.ambienceEnabled ? AMBIENCE_GAIN_BY_MOOD[mood] * polishProfile.cueVolumeScale : 0,
      audioContext.currentTime,
      0.08
    );
    ambienceOscillator.frequency.setTargetAtTime(AMBIENCE_FREQUENCY_BY_MOOD[mood], audioContext.currentTime, 0.08);
    vehicleGain.gain.setTargetAtTime(
      vehiclePresence === "none" || polishProfile.vehicleHumEnabled === false ? 0 : 0.02 * polishProfile.cueVolumeScale,
      audioContext.currentTime,
      0.06
    );
    vehicleOscillator.frequency.setTargetAtTime(resolveVehicleFrequency(worldState.activeVehicleType), audioContext.currentTime, 0.06);
  };

  const playTone = (
    frequency: number,
    durationSeconds: number,
    volume: number,
    waveform: OscillatorType,
    cueName: WorldAudioCueName
  ): void => {
    if (audioContext === null || masterGain === null || telemetry.unlockState !== "unlocked") {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startAt = audioContext.currentTime;
    const stopAt = startAt + durationSeconds;

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(volume * polishProfile.cueVolumeScale, startAt);
    gain.gain.linearRampToValueAtTime(0, stopAt);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(startAt);
    oscillator.stop(stopAt);

    setTelemetry({
      cueCount: telemetry.cueCount + 1,
      lastCue: cueName
    });
  };

  const ensureUnlocked = async (): Promise<boolean> => {
    if (createContext === null) {
      setTelemetry({
        available: false,
        unlockState: "unsupported"
      });

      return false;
    }

    if (audioContext === null) {
      try {
        audioContext = createContext();
      } catch {
        setTelemetry({
          available: true,
          unlockState: "blocked"
        });

        return false;
      }

      if (audioContext === null) {
        setTelemetry({
          available: false,
          unlockState: "unsupported"
        });

        return false;
      }
    }

    try {
      await audioContext.resume?.();
    } catch {
      setTelemetry({
        available: true,
        unlockState: "blocked"
      });

      return false;
    }

    setTelemetry({
      available: true,
      unlockState: "unlocked"
    });
    ensureAudioGraph();
    syncContinuousVoices();

    return true;
  };

  return {
    dispose: () => {
      ambienceOscillator?.disconnect?.();
      vehicleOscillator?.disconnect?.();
      ambienceGain?.disconnect?.();
      vehicleGain?.disconnect?.();
      masterGain?.disconnect?.();
      void audioContext?.close?.();
      listeners.clear();
      ambienceOscillator = null;
      vehicleOscillator = null;
      ambienceGain = null;
      vehicleGain = null;
      masterGain = null;
      audioContext = null;
    },
    getTelemetry: () => ({ ...telemetry }),
    handleChaosEventTypes: (eventTypes) => {
      eventTypes.forEach((eventType) => {
        if (eventType === "vehicle.damaged") {
          playTone(92, 0.18, 0.09, "sawtooth", "impact.vehicle");
        }

        if (eventType === "prop.broken") {
          playTone(128, 0.14, 0.06, "triangle", "impact.prop");
        }
      });
    },
    handleCombatEvents: (events) => {
      events.forEach((event) => {
        if (event.type === "combat.weapon.fired") {
          playTone(event.weaponId === "rifle" ? 460 : 340, 0.08, 0.05, "square", "combat.fire");
        }

        if (event.type === "combat.target.hit") {
          playTone(220, 0.09, 0.04, "triangle", "combat.hit");
        }
      });
    },
    handleHeat: ({ events, snapshot }) => {
      latestHeatSnapshot = snapshot;
      syncContinuousVoices();

      events.forEach((event) => {
        if (event.type === "heat.level.changed") {
          playTone(180 + event.nextLevel * 30, 0.12, 0.05, "sine", "heat.level");
        }

        if (event.type === "heat.pursuit.started" || event.type === "heat.pursuit.contact.lost") {
          playTone(260, 0.16, 0.05, "triangle", "heat.pursuit");
        }
      });
    },
    onTelemetryChanged: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    resetWorld: () => {
      latestHeatSnapshot = null;
      worldState = {
        activeVehicleType: null,
        possessionMode: null,
        worldReady: false
      };
      setTelemetry({
        cueCount: 0,
        lastCue: "none",
        mood: "inactive",
        vehiclePresence: "none"
      });
      syncContinuousVoices();
    },
    setPolishProfile: (profile) => {
      polishProfile = profile;
      syncContinuousVoices();
    },
    setWorldState: (state) => {
      worldState = state;
      syncContinuousVoices();
    },
    unlock: async () => {
      await ensureUnlocked();
    }
  };
}
