import {
  createInitialSessionState,
  transitionSessionState
} from "../../src/app/state/session-state-machine";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
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
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-1-2",
    generationVersion: "story-1-2",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-1-1",
    bounds: {
      minX: -400,
      maxX: 400,
      minZ: -400,
      maxZ: 400
    },
    chunks: [
      {
        id: "chunk-0-0",
        origin: { x: -400, y: 0, z: -400 },
        size: { width: 800, depth: 800 },
        roadIds: ["market-st"]
      }
    ],
    roads: [
      {
        id: "market-st",
        kind: "primary",
        width: 18,
        points: [
          { x: -280, y: 0, z: -220 },
          { x: 280, y: 0, z: 220 }
        ]
      }
    ],
    spawnCandidates: [
      {
        id: "spawn-0",
        chunkId: "chunk-0-0",
        roadId: "market-st",
        position: { x: -20, y: 0, z: -20 },
        headingDegrees: 90,
        surface: "road",
        laneIndex: 0,
        starterVehicle: {
          kind: "starter-car",
          placement: "lane-center",
          dimensions: {
            width: 2.2,
            height: 1.6,
            length: 4.6
          }
        }
      }
    ],
    sceneMetadata: {
      displayName: "San Francisco, CA",
      districtName: "Downtown",
      roadColor: "#f6d365",
      groundColor: "#263238",
      boundaryColor: "#8ec5fc"
    }
  };

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

  it("advances from generation request through generating, loading, ready, and recoverable load error states", () => {
    const bootState = createInitialSessionState();
    const locationSelectState = transitionSessionState(bootState, { type: "app.boot.completed" });
    const resolvingState = transitionSessionState(locationSelectState, {
      type: "location.submit.requested",
      query: "San Francisco, CA"
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
    const generatingState = transitionSessionState(requestedState, {
      type: "world.generation.started"
    });
    const loadingState = transitionSessionState(generatingState, {
      type: "world.manifest.ready",
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
    const readyState = transitionSessionState(loadingState, {
      type: "world.scene.ready"
    });
    const loadErrorState = transitionSessionState(loadingState, {
      type: "world.load.failed",
      failure: {
        ok: false,
        code: "WORLD_SCENE_LOAD_FAILED",
        stage: "world-loading",
        message: "The world could not finish loading.",
        recoverable: true,
        placeName: "San Francisco, CA",
        details: {
          reason: "scene-bootstrap"
        }
      }
    });

    expect(requestedState.phase).toBe("world-generation-requested");
    expect(generatingState.phase).toBe("world-generating");
    expect(loadingState.phase).toBe("world-loading");
    expect(readyState.phase).toBe("world-ready");
    expect(readyState.sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(readyState.spawnCandidate?.id).toBe("spawn-0");
    expect(loadErrorState.phase).toBe("world-load-error");
    expect(loadErrorState.sessionIdentity?.placeName).toBe("San Francisco, CA");
    expect(loadErrorState.formQuery).toBe("San Francisco, CA");
  });

  it("retries a recoverable world-load failure without losing the requested slice handoff", () => {
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
    const requestedState = transitionSessionState(createInitialSessionState(), {
      type: "location.resolve.succeeded",
      identity: handoff.location,
      handoff
    });
    const loadErrorState = transitionSessionState(requestedState, {
      type: "world.load.failed",
      failure: {
        ok: false,
        code: "WORLD_GENERATION_FAILED",
        stage: "world-generating",
        message: "The slice could not be generated.",
        recoverable: true,
        placeName: "San Francisco, CA",
        details: {
          reason: "preset-missing"
        }
      }
    });
    const retriedState = transitionSessionState(loadErrorState, {
      type: "world.retry.requested"
    });

    expect(retriedState.phase).toBe("world-generating");
    expect(retriedState.sessionIdentity?.sessionKey).toBe("san-francisco-ca-story-1-1");
    expect(retriedState.handoff).toEqual(handoff);
    expect(retriedState.error).toBeNull();
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
