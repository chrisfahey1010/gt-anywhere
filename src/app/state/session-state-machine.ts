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
  sessionIdentity: SessionLocationIdentity | null;
  handoff: WorldGenerationRequest | null;
  sliceManifest: SliceManifest | null;
  spawnCandidate: SpawnCandidate | null;
  error: SessionError | null;
}

export type SessionEvent =
  | { type: "app.boot.completed" }
  | { type: "location.submit.requested"; query: string }
  | { type: "location.edit.requested" }
  | { type: "world.restart.requested" }
  | { type: "world.retry.requested" }
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

export function createInitialSessionState(): SessionState {
  return {
    phase: "boot",
    formQuery: "",
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

    case "location.submit.requested":
      return {
        ...state,
        phase: "location-resolving",
        formQuery: normalizeLocationQuery(event.query),
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
        error: null
      };

    case "world.load.failed":
      return {
        ...state,
        phase: "world-load-error",
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
        error: null
      };

    case "location.resolve.failed":
      return {
        ...state,
        phase: "error",
        formQuery: normalizeLocationQuery(event.query),
        error: event.failure
      };

    case "location.edit.requested":
      return {
        ...state,
        phase: "location-select",
        sessionIdentity: null,
        handoff: null,
        sliceManifest: null,
        spawnCandidate: null,
        error: null
      };

    case "world.retry.requested":
      return {
        ...state,
        phase: state.sliceManifest !== null && state.spawnCandidate !== null ? "world-loading" : "world-generating",
        error: null
      };

    default:
      return state;
  }
}
