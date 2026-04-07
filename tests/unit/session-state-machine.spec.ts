import {
  createInitialSessionState,
  transitionSessionState
} from "../../src/app/state/session-state-machine";
import {
  LocationResolver,
  createWorldGenerationRequest,
  normalizeLocationQuery,
  validateLocationQuery
} from "../../src/world/generation/location-resolver";
import {
  invalidLocationQuery,
  validSingleTokenLocationQuery
} from "../fixtures/location-queries";

describe("session state machine", () => {
  it("moves through the explicit top-level session phases", () => {
    const bootState = createInitialSessionState();
    const locationSelectState = transitionSessionState(bootState, { type: "app.boot.completed" });
    const resolvingState = transitionSessionState(locationSelectState, {
      type: "location.submit.requested",
      query: "  san francisco, ca  "
    });
    const handoff = createWorldGenerationRequest(
      {
        query: "San Francisco, CA",
        normalizedQuery: "san francisco, ca",
        placeName: "San Francisco, CA",
        sessionKey: "san-francisco-ca-story-1-1",
        reuseKey: "san-francisco-ca"
      },
      () => "2026-04-07T00:00:00.000Z"
    );
    const requestedState = transitionSessionState(resolvingState, {
      type: "location.resolve.succeeded",
      identity: handoff.location,
      handoff
    });
    const errorState = transitionSessionState(requestedState, {
      type: "location.resolve.failed",
      query: "Atlantis",
      failure: {
        ok: false,
        code: "LOCATION_QUERY_UNRESOLVABLE",
        message: "That place could not be resolved yet.",
        recoverable: true,
        query: "Atlantis"
      }
    });

    expect(bootState.phase).toBe("boot");
    expect(locationSelectState.phase).toBe("location-select");
    expect(resolvingState.phase).toBe("location-resolving");
    expect(requestedState.phase).toBe("world-generation-requested");
    expect(errorState.phase).toBe("error");
  });

  it("normalizes valid queries and returns typed recoverable failures for invalid ones", () => {
    expect(normalizeLocationQuery("  Times   Square  ")).toBe("Times Square");
    expect(validateLocationQuery("San Francisco")).toEqual({
      ok: true,
      value: "San Francisco"
    });
    expect(validateLocationQuery("   ")).toMatchObject({
      ok: false,
      code: "LOCATION_QUERY_REQUIRED",
      recoverable: true
    });
    expect(validateLocationQuery("1")).toMatchObject({
      ok: false,
      code: "LOCATION_QUERY_INVALID",
      recoverable: true
    });
  });

  it("rejects unsupported single-token queries without blocking supported places", async () => {
    const resolver = new LocationResolver();

    await expect(resolver.resolve(validSingleTokenLocationQuery)).resolves.toMatchObject({
      ok: true,
      value: {
        placeName: validSingleTokenLocationQuery
      }
    });

    await expect(resolver.resolve(invalidLocationQuery)).resolves.toMatchObject({
      ok: false,
      code: "LOCATION_QUERY_UNRESOLVABLE",
      recoverable: true,
      query: invalidLocationQuery
    });
  });
});
