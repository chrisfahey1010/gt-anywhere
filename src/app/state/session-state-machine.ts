import type {
  LocationResolveFailure,
  SessionLocationIdentity,
  WorldGenerationRequest
} from "../../world/generation/location-resolver";
import { normalizeLocationQuery } from "../../world/generation/location-resolver";

export type SessionPhase =
  | "boot"
  | "location-select"
  | "location-resolving"
  | "world-generation-requested"
  | "error";

export interface SessionState {
  phase: SessionPhase;
  formQuery: string;
  sessionIdentity: SessionLocationIdentity | null;
  handoff: WorldGenerationRequest | null;
  error: LocationResolveFailure | null;
}

export type SessionEvent =
  | { type: "app.boot.completed" }
  | { type: "location.submit.requested"; query: string }
  | { type: "location.edit.requested" }
  | {
      type: "location.resolve.succeeded";
      identity: SessionLocationIdentity;
      handoff: WorldGenerationRequest;
    }
  | { type: "location.resolve.failed"; query: string; failure: LocationResolveFailure };

export function createInitialSessionState(): SessionState {
  return {
    phase: "boot",
    formQuery: "",
    sessionIdentity: null,
    handoff: null,
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
        error: null
      };

    case "location.resolve.succeeded":
      return {
        ...state,
        phase: "world-generation-requested",
        formQuery: event.identity.placeName,
        sessionIdentity: event.identity,
        handoff: event.handoff,
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
        handoff: null,
        error: null
      };

    default:
      return state;
  }
}
