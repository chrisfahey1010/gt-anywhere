import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import { GameEventBus } from "../../src/app/events/game-events";
import { createLogger, type LogEntry } from "../../src/app/logging/logger";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type {
  SliceManifest,
  SpawnCandidate
} from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import {
  LocationResolver,
  type ResolveLocationResult
} from "../../src/world/generation/location-resolver";
import {
  invalidLocationQuery,
  unresolvableLocationQuery,
  validLocationAliasQuery
} from "../fixtures/location-queries";
import { createWorldSceneRuntimeError } from "../../src/world/generation/world-load-failure";

describe("location entry integration", () => {
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

  function createSuccessfulWorldDependencies(): {
    sliceGenerator: WorldSliceGenerator;
    sceneLoader: WorldSceneLoader;
    getReceivedSpawnCandidate(): SpawnCandidate | null;
  } {
    let receivedSpawnCandidate: SpawnCandidate | null = null;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, spawnCandidate }) => {
        receivedSpawnCandidate = spawnCandidate;
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    return {
      sliceGenerator,
      sceneLoader,
      getReceivedSpawnCandidate: () => receivedSpawnCandidate
    };
  }

  it("shows the resolved place name and lets the player return to editing after the world becomes ready", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator, sceneLoader, getReceivedSpawnCandidate } = createSuccessfulWorldDependencies();
    const app = await createGameApp({
      host,
      sliceGenerator,
      sceneLoader,
      clock: () => "2026-04-07T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const loadingFeedback = host.querySelector('[data-testid="loading-feedback"]');
    const primaryAction = host.querySelector(".primary-action") as HTMLButtonElement;
    const editLocation = host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(loadingFeedback?.textContent).toContain("San Francisco, CA");
    expect(primaryAction.disabled).toBe(false);
    expect(getReceivedSpawnCandidate()).toMatchObject({
      id: "spawn-0",
      roadId: "market-st",
      starterVehicle: {
        kind: "starter-car"
      }
    });

    editLocation.click();

    const inputAfterEdit = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(inputAfterEdit.disabled).toBe(false);
    expect(inputAfterEdit.value).toBe("San Francisco, CA");
  });

  it("stores a serializable handoff contract and emits typed events with structured logs", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const { sliceGenerator, sceneLoader } = createSuccessfulWorldDependencies();
    const emittedEvents: string[] = [];
    const logEntries: LogEntry[] = [];
    let readyMilestone: string | null = null;

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolved", (event) => emittedEvents.push(event.type));
    eventBus.on("world.generation.requested", (event) => emittedEvents.push(event.type));
    eventBus.on("world.generation.started", (event) => emittedEvents.push(event.type));
    eventBus.on("world.manifest.ready", (event) => emittedEvents.push(event.type));
    eventBus.on("world.scene.ready", (event) => {
      emittedEvents.push(event.type);
      readyMilestone = event.readinessMilestone;
    });

    const app = await createGameApp({
      host,
      eventBus,
      sliceGenerator,
      sceneLoader,
      logger: createLogger((entry) => {
        logEntries.push(entry);
      }),
      clock: () => "2026-04-07T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const serializedHandoff = JSON.parse(JSON.stringify(app.getSnapshot().handoff));

    expect(serializedHandoff.location.placeName).toBe("San Francisco, CA");
    expect(serializedHandoff.pipeline).toContain("SliceManifestStore");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested",
      "world.generation.started",
      "world.manifest.ready",
      "world.scene.ready"
    ]);
    expect(logEntries.map((entry) => entry.eventName)).toEqual([
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested",
      "world.generation.started",
      "world.manifest.ready",
      "world.scene.ready"
    ]);
    expect(logEntries.find((entry) => entry.eventName === "world.manifest.ready")?.context).toMatchObject({
      durationMs: expect.any(Number),
      chunkCount: expect.any(Number),
      roadCount: expect.any(Number)
    });
    expect(logEntries.find((entry) => entry.eventName === "world.scene.ready")?.context).toMatchObject({
      durationMs: expect.any(Number),
      readinessMilestone: "controllable-vehicle"
    });
    expect(readyMilestone).toBe("controllable-vehicle");
  });

  it("emits a typed starter-vehicle spawn failure while preserving the loaded slice context", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const failures: Array<{ code: string; stage: string }> = [];
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    const sceneLoader: WorldSceneLoader = {
      load: async () => {
        throw createWorldSceneRuntimeError(
          "STARTER_VEHICLE_SPAWN_FAILED",
          "vehicle-spawning",
          "The starter vehicle could not be spawned.",
          { spawnCandidateId: "spawn-0" }
        );
      }
    };

    eventBus.on("world.load.failed", (event) => {
      failures.push({
        code: event.failure.code,
        stage: event.failure.stage
      });
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(app.getSnapshot().error).toMatchObject({
      code: "STARTER_VEHICLE_SPAWN_FAILED",
      stage: "vehicle-spawning"
    });
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().spawnCandidate?.id).toBe("spawn-0");
    expect(host.textContent).toContain("Retry load");
    expect(failures).toEqual([
      {
        code: "STARTER_VEHICLE_SPAWN_FAILED",
        stage: "vehicle-spawning"
      }
    ]);
  });

  it("emits a typed starter-vehicle possession failure while preserving retry and edit flows", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    const sceneLoader: WorldSceneLoader = {
      load: async () => {
        throw createWorldSceneRuntimeError(
          "STARTER_VEHICLE_POSSESSION_FAILED",
          "vehicle-possession",
          "The starter vehicle could not be controlled.",
          { spawnCandidateId: "spawn-0" }
        );
      }
    };

    const app = await createGameApp({ host, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(app.getSnapshot().error).toMatchObject({
      code: "STARTER_VEHICLE_POSSESSION_FAILED",
      stage: "vehicle-possession"
    });
    expect(host.textContent).toContain("Edit location");
    expect(host.textContent).toContain("Retry load");
  });

  it("advances to a world-ready state without losing session identity or generated slice data", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator, sceneLoader } = createSuccessfulWorldDependencies();
    const app = await createGameApp({ host, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().sessionIdentity?.placeName).toBe("San Francisco, CA");
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().spawnCandidate?.id).toBe("spawn-0");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).not.toBeNull();
    expect(host.textContent).toContain("Slice ready");
  });

  it("keeps the resolved place name visible and allows retry after a recoverable load failure", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const emittedEvents: string[] = [];
    const eventBus = new GameEventBus();
    let attempts = 0;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => {
        attempts += 1;

        return {
          ok: true,
          manifest,
          spawnCandidate: manifest.spawnCandidates[0]
        };
      }
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        renderHost.innerHTML = "";

        if (attempts === 1) {
          throw new Error("scene bootstrap failed");
        }

        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.load.failed", (event) => emittedEvents.push(event.type));
    eventBus.on("world.scene.ready", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(host.textContent).toContain("San Francisco, CA");
    expect(host.textContent).toContain("Retry load");

    const retryAction = host.querySelector('[data-testid="retry-load"]') as HTMLButtonElement;

    retryAction.click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(emittedEvents).toEqual(["world.load.failed", "world.scene.ready"]);
  });

  it("keeps the player in the location flow and shows a recoverable error for an unresolvable query", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const emittedEvents: string[] = [];

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolve-failed", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = unresolvableLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const inputAfterFailure = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const errorMessage = host.querySelector('[data-testid="error-message"]');
    const retryAction = host.querySelector(".primary-action") as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("error");
    expect(app.getSnapshot().handoff).toBeNull();
    expect(inputAfterFailure.value).toBe(unresolvableLocationQuery);
    expect(errorMessage?.textContent).toContain("could not be resolved");
    expect(retryAction.textContent).toBe("Try Again");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolve-failed"
    ]);
  });

  it("keeps the player in the location flow for an unsupported single-token query", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const emittedEvents: string[] = [];

    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolve-failed", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = invalidLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const inputAfterFailure = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const errorMessage = host.querySelector('[data-testid="error-message"]');

    expect(app.getSnapshot().phase).toBe("error");
    expect(app.getSnapshot().handoff).toBeNull();
    expect(inputAfterFailure.value).toBe(invalidLocationQuery);
    expect(errorMessage?.textContent).toContain("could not be resolved");
    expect(emittedEvents).toEqual([
      "session.location.submitted",
      "session.location.resolve-failed"
    ]);
  });

  it("ignores a late resolve result after the player edits during location resolution", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let resolveLocation: ((value: ResolveLocationResult) => void) | undefined;
    let generateCalls = 0;
    const resolver: Pick<LocationResolver, "resolve"> = {
      resolve: async () =>
        new Promise((resolve) => {
          resolveLocation = resolve;
        })
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => {
        generateCalls += 1;

        return {
          ok: true,
          manifest,
          spawnCandidate: manifest.spawnCandidates[0]
        };
      }
    };

    const app = await createGameApp({
      host,
      resolver: resolver as LocationResolver,
      sliceGenerator,
      sceneLoader: createSuccessfulWorldDependencies().sceneLoader
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    const resolved = await new LocationResolver().resolve(validLocationAliasQuery);

    if (resolveLocation) {
      resolveLocation(resolved);
    }

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(app.getSnapshot().handoff).toBeNull();
    expect(generateCalls).toBe(0);
    expect(host.querySelector('[data-testid="world-ready-scene"]')).toBeNull();
  });

  it("ignores a late scene-load completion after the player edits during delayed starter-vehicle possession", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    let resolveSceneLoad:
      | ((value: { canvas: HTMLCanvasElement; dispose(): void }) => void)
      | undefined;
    const emittedEvents: string[] = [];
    const eventBus = new GameEventBus();
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) =>
        new Promise((resolve) => {
          resolveSceneLoad = (value) => {
            renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';
            resolve(value);
          };
        })
    };

    eventBus.on("world.scene.ready", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    resolveSceneLoad?.({
      canvas: document.createElement("canvas"),
      dispose: () => {
        const worldScene = host.querySelector('[data-testid="world-ready-scene"]');

        worldScene?.remove();
      }
    });

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(emittedEvents).toEqual([]);
    expect(host.querySelector('[data-testid="world-ready-scene"]')).toBeNull();
  });
});
