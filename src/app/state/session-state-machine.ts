import type { ReplaySelection } from "../config/replay-options";
import {
  parsePartialPlayerSettings,
  type PlayerSettings
} from "../config/settings-schema";
import {
  resolveBootPlayerSettings,
  resolveCapabilityDefaultPlayerSettings,
  resolveInteractivePlayerSettings
} from "../config/platform";
import type {
  LocationResolveFailure,
  SessionLocationIdentity,
  WorldGenerationRequest
} from "../../world/generation/location-resolver";
import type { SpawnCandidate, SliceManifest } from "../../world/chunks/slice-manifest";
import type { WorldLoadFailure } from "../../world/generation/world-load-failure";
import { normalizeLocationQuery } from "../../world/generation/location-resolver";

export type SessionPhase =
  | "boot"
  | "location-select"
  | "location-resolving"
  | "world-generation-requested"
  | "world-generating"
  | "world-restarting"
  | "world-loading"
  | "world-ready"
  | "world-load-error"
  | "error";

export type SessionError = LocationResolveFailure | WorldLoadFailure;

export interface SessionState {
  phase: SessionPhase;
  formQuery: string;
  replaySelection: ReplaySelection | null;
  capabilityDefaults: PlayerSettings;
  savedSettings: Partial<PlayerSettings> | null;
  explicitShellSettings: Partial<PlayerSettings>;
  currentSettings: PlayerSettings;
  activeWorldSettings: PlayerSettings | null;
  settingsOpen: boolean;
  sessionIdentity: SessionLocationIdentity | null;
  handoff: WorldGenerationRequest | null;
  sliceManifest: SliceManifest | null;
  spawnCandidate: SpawnCandidate | null;
  error: SessionError | null;
}

export type SessionEvent =
  | { type: "app.boot.completed" }
  | { type: "settings.panel.toggled" }
  | { type: "settings.changed"; changes: Partial<PlayerSettings> }
  | { type: "settings.applied"; savedSettings: PlayerSettings }
  | { type: "location.submit.requested"; query: string }
  | { type: "location.edit.requested" }
  | { type: "world.restart.requested"; handoff?: WorldGenerationRequest }
  | { type: "world.replay.requested"; handoff?: WorldGenerationRequest; selection: ReplaySelection }
  | { type: "world.retry.requested"; handoff?: WorldGenerationRequest }
  | {
      type: "location.resolve.succeeded";
      identity: SessionLocationIdentity;
      handoff: WorldGenerationRequest;
    }
  | { type: "world.generation.started" }
  | {
      type: "world.manifest.ready";
      manifest: SliceManifest;
      spawnCandidate: SpawnCandidate;
    }
  | { type: "world.scene.ready" }
  | { type: "world.load.failed"; failure: WorldLoadFailure }
  | { type: "location.resolve.failed"; query: string; failure: LocationResolveFailure };

export interface CreateInitialSessionStateOptions {
  capabilityDefaults?: PlayerSettings | null;
  savedSettings?: Partial<PlayerSettings> | null;
}

function mergeCurrentSettings(
  state: Pick<SessionState, "capabilityDefaults" | "explicitShellSettings" | "savedSettings">
): PlayerSettings {
  return resolveInteractivePlayerSettings({
    capabilityDefaults: state.capabilityDefaults,
    explicitShellSettings: state.explicitShellSettings,
    savedSettings: state.savedSettings
  });
}

export function createInitialSessionState(options: CreateInitialSessionStateOptions = {}): SessionState {
  const capabilityDefaults = options.capabilityDefaults ?? resolveCapabilityDefaultPlayerSettings();
  const savedSettings = parsePartialPlayerSettings(options.savedSettings);
  const currentSettings = resolveBootPlayerSettings({
    capabilityDefaults,
    savedSettings
  });

  return {
    phase: "boot",
    formQuery: "",
    replaySelection: null,
    capabilityDefaults,
    savedSettings,
    explicitShellSettings: {},
    currentSettings,
    activeWorldSettings: null,
    settingsOpen: false,
    sessionIdentity: null,
    handoff: null,
    sliceManifest: null,
    spawnCandidate: null,
    error: null
  };
}

export function transitionSessionState(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "app.boot.completed":
      return {
        ...state,
        phase: "location-select",
        error: null
      };

    case "settings.panel.toggled":
      return {
        ...state,
        settingsOpen: !state.settingsOpen
      };

    case "settings.changed": {
      const explicitShellSettings = {
        ...state.explicitShellSettings,
        ...parsePartialPlayerSettings(event.changes)
      };

      return {
        ...state,
        explicitShellSettings,
        currentSettings: mergeCurrentSettings({
          capabilityDefaults: state.capabilityDefaults,
          explicitShellSettings,
          savedSettings: state.savedSettings
        })
      };
    }

    case "settings.applied": {
      const savedSettings = parsePartialPlayerSettings(event.savedSettings);

      return {
        ...state,
        savedSettings,
        explicitShellSettings: {},
        currentSettings: resolveBootPlayerSettings({
          capabilityDefaults: state.capabilityDefaults,
          savedSettings
        }),
        settingsOpen: false
      };
    }

    case "location.submit.requested":
      return {
        ...state,
        phase: "location-resolving",
        activeWorldSettings: null,
        formQuery: normalizeLocationQuery(event.query),
        replaySelection: null,
        settingsOpen: false,
        handoff: null,
        sliceManifest: null,
        spawnCandidate: null,
        sessionIdentity: null,
        error: null
      };

    case "location.resolve.succeeded":
      return {
        ...state,
        phase: "world-generation-requested",
        formQuery: event.identity.placeName,
        replaySelection: null,
        sessionIdentity: event.identity,
        handoff: event.handoff,
        sliceManifest: null,
        spawnCandidate: null,
        error: null
      };

    case "world.generation.started":
      return {
        ...state,
        phase: "world-generating",
        error: null
      };

    case "world.manifest.ready":
      return {
        ...state,
        phase: "world-loading",
        sliceManifest: event.manifest,
        spawnCandidate: event.spawnCandidate,
        error: null
      };

    case "world.scene.ready":
      return {
        ...state,
        phase: "world-ready",
        activeWorldSettings: state.currentSettings,
        error: null
      };

    case "world.load.failed":
      return {
        ...state,
        phase: "world-load-error",
        settingsOpen: false,
        formQuery: event.failure.placeName,
        error: event.failure
      };

    case "world.restart.requested":
      if (state.phase !== "world-ready") {
        return state;
      }

      return {
        ...state,
        phase: "world-restarting",
        handoff: event.handoff ?? state.handoff,
        replaySelection: null,
        settingsOpen: false,
        error: null
      };

    case "world.replay.requested":
      if (state.phase !== "world-ready") {
        return state;
      }

      return {
        ...state,
        phase: "world-restarting",
        handoff: event.handoff ?? state.handoff,
        replaySelection: event.selection,
        settingsOpen: false,
        error: null
      };

    case "location.resolve.failed":
      return {
        ...state,
        phase: "error",
        settingsOpen: false,
        formQuery: normalizeLocationQuery(event.query),
        error: event.failure
      };

    case "location.edit.requested":
      return {
        ...state,
        phase: "location-select",
        activeWorldSettings: null,
        settingsOpen: false,
        replaySelection: null,
        sessionIdentity: null,
        handoff: null,
        sliceManifest: null,
        spawnCandidate: null,
        error: null
      };

    case "world.retry.requested":
      return {
        ...state,
        handoff: event.handoff ?? state.handoff,
        phase: state.sliceManifest !== null && state.spawnCandidate !== null ? "world-loading" : "world-generating",
        settingsOpen: false,
        error: null
      };

    default:
      return state;
  }
}
