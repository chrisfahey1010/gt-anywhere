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
    districts: [],
    worldEntries: [],
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

  function createIncrementingNow(start = 100, step = 25): () => number {
    let current = start;

    return () => {
      const value = current;
      current += step;
      return value;
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

  it("prewarms the lazy world scene loader after shell boot and reuses the memoized loader for the first world load", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const scheduledTasks: Array<() => void> = [];
    let sceneLoaderFactoryCalls = 0;
    let sceneLoadCalls = 0;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        sceneLoadCalls += 1;
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const app = await createGameApp({
      host,
      sliceGenerator,
      sceneLoaderFactory: async () => {
        sceneLoaderFactoryCalls += 1;
        return sceneLoader;
      },
      scheduleBackgroundTask: (task) => {
        scheduledTasks.push(task);
      }
    });

    expect(host.querySelector('[data-testid="location-input"]')).not.toBeNull();
    expect(sceneLoaderFactoryCalls).toBe(0);
    expect(scheduledTasks).toHaveLength(1);

    scheduledTasks[0]?.();
    await Promise.resolve();

    expect(sceneLoaderFactoryCalls).toBe(1);

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(sceneLoaderFactoryCalls).toBe(1);
    expect(sceneLoadCalls).toBe(1);
  });

  it("shows same-location replay options only in world-ready and normalizes each launch into one replay selection contract", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    const sceneLoadRecords: Array<{
      replaySelection: { id: string; kind: string; label: string; starterVehicleType: string } | null;
      starterVehicleType: string | null;
    }> = [];
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, replaySelection, starterVehicleType }) => {
        sceneLoadRecords.push({
          replaySelection: replaySelection
            ? {
                id: replaySelection.id,
                kind: replaySelection.kind,
                label: replaySelection.label,
                starterVehicleType: replaySelection.starterVehicleType
              }
            : null,
          starterVehicleType: starterVehicleType ?? null
        });
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({
      host,
      sliceGenerator,
      sceneLoader,
      clock: () => "2026-04-07T00:00:00.000Z"
    });

    expect(host.querySelector('[data-testid="replay-vehicle-sedan"]')).toBeNull();
    expect(host.querySelector('[data-testid="replay-intention-precision"]')).toBeNull();

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const precisionReplay = host.querySelector('[data-testid="replay-intention-precision"]') as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(host.querySelector('[data-testid="replay-vehicle-sedan"]')).not.toBeNull();
    expect(precisionReplay).not.toBeNull();
    expect(app.getSnapshot().replaySelection).toBeNull();

    precisionReplay.click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().replaySelection).toMatchObject({
      id: "intention-precision",
      kind: "intention",
      label: "Precision",
      starterVehicleType: "sports-car"
    });
    expect(sceneLoadRecords).toEqual([
      {
        replaySelection: null,
        starterVehicleType: null
      },
      {
        replaySelection: {
          id: "intention-precision",
          kind: "intention",
          label: "Precision",
          starterVehicleType: "sports-car"
        },
        starterVehicleType: "sports-car"
      }
    ]);
  });

  it("reuses the cached manifest and stable place identity when replaying the same location", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const now = createIncrementingNow();
    const manifestStoreById = new Map<string, SliceManifest>();
    const manifestStoreByReuseKey = new Map<string, SliceManifest>();
    const baseResolver = new LocationResolver();
    const sceneLoadRecords: Array<{
      manifest: SliceManifest;
      replaySelectionId: string | null;
    }> = [];
    let resolveCalls = 0;
    let generateCalls = 0;
    const resolver: Pick<LocationResolver, "resolve"> = {
      resolve: async (query) => {
        resolveCalls += 1;
        return baseResolver.resolve(query);
      }
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => {
        generateCalls += 1;
        manifestStoreById.set(manifest.sliceId, manifest);
        manifestStoreByReuseKey.set(manifest.location.reuseKey, manifest);

        return {
          ok: true,
          manifest,
          spawnCandidate: manifest.spawnCandidates[0]
        };
      },
      getStoredManifest: (sliceId) => manifestStoreById.get(sliceId) ?? null,
      getStoredManifestByReuseKey: (reuseKey) => manifestStoreByReuseKey.get(reuseKey) ?? null
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, manifest, replaySelection }) => {
        sceneLoadRecords.push({
          manifest,
          replaySelectionId: replaySelection?.id ?? null
        });
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({
      host,
      resolver: resolver as LocationResolver,
      sliceGenerator,
      sceneLoader,
      clock: () => "2026-04-07T00:00:00.000Z",
      now
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const firstManifestReadyAtMs = Number(renderHost.dataset.worldManifestReadyAtMs ?? "0");
    const firstSceneReadyAtMs = Number(renderHost.dataset.worldSceneReadyAtMs ?? "0");

    expect(firstManifestReadyAtMs).toBeGreaterThan(0);
    expect(firstSceneReadyAtMs).toBeGreaterThan(firstManifestReadyAtMs);

    (host.querySelector('[data-testid="replay-vehicle-heavy-truck"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(resolveCalls).toBe(1);
    expect(generateCalls).toBe(1);
    expect(manifestStoreById.size).toBe(1);
    expect(manifestStoreByReuseKey.size).toBe(1);
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().handoff?.location.reuseKey).toBe(manifest.location.reuseKey);
    expect(sceneLoadRecords).toHaveLength(2);
    expect(sceneLoadRecords[0]?.manifest).toBe(sceneLoadRecords[1]?.manifest);
    expect(sceneLoadRecords[0]?.replaySelectionId).toBeNull();
    expect(sceneLoadRecords[1]?.replaySelectionId).toBe("vehicle-heavy-truck");
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(firstManifestReadyAtMs);
    expect(Number(renderHost.dataset.worldSceneReadyAtMs ?? "0")).toBeGreaterThan(firstSceneReadyAtMs);
    expect(renderHost.dataset.worldLoadFailedAtMs).toBeUndefined();
  });

  it("offers restart from spawn in world-ready and does not resolve the location again", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const now = createIncrementingNow();
    let resolveCalls = 0;
    let generateCalls = 0;
    const baseResolver = new LocationResolver();
    const resolver: Pick<LocationResolver, "resolve"> = {
      resolve: async (query) => {
        resolveCalls += 1;
        return baseResolver.resolve(query);
      }
    };
    const restartManifest: SliceManifest = {
      ...manifest,
      sliceId: "san-francisco-ca-story-1-5-regenerated",
      spawnCandidates: [
        {
          ...manifest.spawnCandidates[0],
          id: "spawn-regenerated",
          roadId: "market-st-regenerated"
        }
      ]
    };
    const sceneLoadRecords: Array<{ manifest: SliceManifest; spawnCandidate: SpawnCandidate }> = [];
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => {
        generateCalls += 1;

        if (generateCalls === 1) {
          return {
            ok: true,
            manifest,
            spawnCandidate: manifest.spawnCandidates[0]
          };
        }

        return {
          ok: true,
          manifest: restartManifest,
          spawnCandidate: restartManifest.spawnCandidates[0]
        };
      }
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, manifest, spawnCandidate }) => {
        sceneLoadRecords.push({ manifest, spawnCandidate });
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({
      host,
      resolver: resolver as LocationResolver,
      sliceGenerator,
      sceneLoader,
      clock: () => "2026-04-07T00:00:00.000Z",
      now
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const firstManifestReadyAtMs = Number(renderHost.dataset.worldManifestReadyAtMs ?? "0");
    const firstSceneReadyAtMs = Number(renderHost.dataset.worldSceneReadyAtMs ?? "0");

    expect(firstManifestReadyAtMs).toBeGreaterThan(0);
    expect(firstSceneReadyAtMs).toBeGreaterThan(firstManifestReadyAtMs);

    const restartAction = host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(restartAction.textContent).toContain("Restart from spawn");

    restartAction.click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().sessionIdentity?.placeName).toBe("San Francisco, CA");
    expect(resolveCalls).toBe(1);
    expect(generateCalls).toBe(1);
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().spawnCandidate?.id).toBe("spawn-0");
    expect(sceneLoadRecords).toHaveLength(2);
    expect(sceneLoadRecords[0]).toMatchObject({
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
    expect(sceneLoadRecords[1]).toMatchObject({
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(firstManifestReadyAtMs);
    expect(Number(renderHost.dataset.worldSceneReadyAtMs ?? "0")).toBeGreaterThan(firstSceneReadyAtMs);
    expect(renderHost.dataset.worldLoadFailedAtMs).toBeUndefined();
  });

  it("stores a serializable handoff contract and emits typed events with structured logs", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const { sliceGenerator, sceneLoader } = createSuccessfulWorldDependencies();
    const emittedEvents: string[] = [];
    const logEntries: LogEntry[] = [];
    let shellReadyDurationMs: number | null = null;
    let manifestDurationMs: number | null = null;
    let readyMilestone: string | null = null;
    let sceneDurationMs: number | null = null;

    eventBus.on("app.shell.ready", (event) => {
      emittedEvents.push(event.type);
      shellReadyDurationMs = event.durationMs;
    });
    eventBus.on("session.location.submitted", (event) => emittedEvents.push(event.type));
    eventBus.on("session.location.resolved", (event) => emittedEvents.push(event.type));
    eventBus.on("world.generation.requested", (event) => emittedEvents.push(event.type));
    eventBus.on("world.generation.started", (event) => emittedEvents.push(event.type));
    eventBus.on("world.manifest.ready", (event) => {
      emittedEvents.push(event.type);
      manifestDurationMs = event.durationMs;
    });
    eventBus.on("world.scene.ready", (event) => {
      emittedEvents.push(event.type);
      readyMilestone = event.readinessMilestone;
      sceneDurationMs = event.durationMs;
    });

    const app = await createGameApp({
      host,
      eventBus,
      sliceGenerator,
      sceneLoader,
      logger: createLogger((entry) => {
        logEntries.push(entry);
      }),
      clock: () => "2026-04-07T00:00:00.000Z",
      now: createIncrementingNow()
    });

    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    expect(renderHost.dataset.phase).toBe("location-select");
    expect(Number(renderHost.dataset.shellReadyAtMs ?? "0")).toBeGreaterThan(0);
    expect(renderHost.dataset.worldManifestReadyAtMs).toBeUndefined();
    expect(renderHost.dataset.worldSceneReadyAtMs).toBeUndefined();

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const serializedHandoff = JSON.parse(JSON.stringify(app.getSnapshot().handoff));

    expect(serializedHandoff.location.placeName).toBe("San Francisco, CA");
    expect(serializedHandoff.pipeline).toContain("SliceManifestStore");
    expect(emittedEvents).toEqual([
      "app.shell.ready",
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested",
      "world.generation.started",
      "world.manifest.ready",
      "world.scene.ready"
    ]);
    expect(logEntries.map((entry) => entry.eventName)).toEqual([
      "app.shell.ready",
      "session.location.submitted",
      "session.location.resolved",
      "world.generation.requested",
      "world.generation.started",
      "world.manifest.ready",
      "world.scene.ready"
    ]);
    expect(logEntries.find((entry) => entry.eventName === "app.shell.ready")?.context).toMatchObject({
      durationMs: expect.any(Number),
      phase: "location-select"
    });
    expect(logEntries.find((entry) => entry.eventName === "world.manifest.ready")?.context).toMatchObject({
      durationMs: expect.any(Number),
      chunkCount: expect.any(Number),
      roadCount: expect.any(Number)
    });
    expect(logEntries.find((entry) => entry.eventName === "world.scene.ready")?.context).toMatchObject({
      durationMs: expect.any(Number),
      readinessMilestone: "controllable-vehicle"
    });
    expect(shellReadyDurationMs).toEqual(expect.any(Number));
    expect(manifestDurationMs).toEqual(expect.any(Number));
    expect(readyMilestone).toBe("controllable-vehicle");
    expect(sceneDurationMs).toEqual(expect.any(Number));
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(
      Number(renderHost.dataset.shellReadyAtMs ?? "0")
    );
    expect(Number(renderHost.dataset.worldSceneReadyAtMs ?? "0")).toBeGreaterThan(
      Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")
    );
    expect(Number(renderHost.dataset.worldManifestDurationMs ?? "0")).toBeGreaterThan(0);
    expect(Number(renderHost.dataset.worldSceneDurationMs ?? "0")).toBeGreaterThan(0);
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

  it("emits a typed combat-runtime initialization failure while preserving retry and edit flows", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    const sceneLoader: WorldSceneLoader = {
      load: async () => {
        throw createWorldSceneRuntimeError(
          "STARTER_VEHICLE_POSSESSION_FAILED",
          "vehicle-possession",
          "The world combat runtime could not be initialized.",
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
    const now = createIncrementingNow();
    const emittedEvents: string[] = [];
    const eventBus = new GameEventBus();
    let generateCalls = 0;
    let sceneLoadAttempts = 0;
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
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        sceneLoadAttempts += 1;
        renderHost.innerHTML = "";

        if (sceneLoadAttempts === 1) {
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

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader, now });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(host.textContent).toContain("San Francisco, CA");
    expect(host.textContent).toContain("Retry load");
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(0);
    expect(renderHost.dataset.worldSceneReadyAtMs).toBeUndefined();
    expect(Number(renderHost.dataset.worldLoadFailedAtMs ?? "0")).toBeGreaterThan(0);
    expect(Number(renderHost.dataset.worldLoadFailedDurationMs ?? "0")).toBeGreaterThan(0);

    const retryAction = host.querySelector('[data-testid="retry-load"]') as HTMLButtonElement;

    retryAction.click();
    await Promise.resolve();

    expect(renderHost.dataset.worldSceneReadyAtMs).toBeUndefined();
    expect(renderHost.dataset.worldLoadFailedAtMs).toBeUndefined();
    expect(renderHost.dataset.worldLoadFailedDurationMs).toBeUndefined();

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(generateCalls).toBe(1);
    expect(emittedEvents).toEqual(["world.load.failed", "world.scene.ready"]);
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(0);
    expect(Number(renderHost.dataset.worldSceneReadyAtMs ?? "0")).toBeGreaterThan(
      Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")
    );
    expect(renderHost.dataset.worldLoadFailedAtMs).toBeUndefined();
  });

  it("disposes the previous world scene and keeps a single ready scene after restart", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const readyEvents: string[] = [];
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    const disposeCalls: number[] = [];
    let loadCount = 0;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        loadCount += 1;
        const loadId = loadCount;
        disposeCalls.push(0);
        renderHost.innerHTML = `<div data-testid="world-ready-scene" data-load-id="${loadId}">Fake world scene ${loadId}</div>`;

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            disposeCalls[loadId - 1] = (disposeCalls[loadId - 1] ?? 0) + 1;
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.scene.ready", (event) => readyEvents.push(event.type));

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(readyEvents).toEqual(["world.scene.ready", "world.scene.ready"]);
    expect(disposeCalls).toEqual([1, 0]);
    expect(host.querySelectorAll('[data-testid="world-ready-scene"]')).toHaveLength(1);
    expect(host.querySelector('[data-load-id="2"]')).not.toBeNull();
  });

  it("preserves the same cached slice context when restart fails again", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let generateCalls = 0;
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
    let sceneLoadAttempts = 0;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        sceneLoadAttempts += 1;

        if (sceneLoadAttempts === 2) {
          throw new Error("scene bootstrap failed again");
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

    const app = await createGameApp({ host, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(app.getSnapshot().sessionIdentity?.placeName).toBe("San Francisco, CA");
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().spawnCandidate?.id).toBe("spawn-0");
    expect(generateCalls).toBe(1);
    expect(host.textContent).toContain("Retry load");
    expect(host.textContent).toContain("Edit location");
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

  it("ignores a late restart scene-load completion after the player edits during delayed restart", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const { sliceGenerator } = createSuccessfulWorldDependencies();
    let resolveRestartSceneLoad:
      | ((value: { canvas: HTMLCanvasElement; dispose(): void }) => void)
      | undefined;
    const emittedEvents: string[] = [];
    const eventBus = new GameEventBus();
    let loadCount = 0;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        loadCount += 1;

        if (loadCount === 1) {
          renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

          return {
            canvas: document.createElement("canvas"),
            dispose: () => {
              renderHost.innerHTML = "";
            }
          };
        }

        return new Promise((resolve) => {
          resolveRestartSceneLoad = (value) => {
            renderHost.innerHTML = '<div data-testid="world-ready-scene">Restarted world scene</div>';
            resolve(value);
          };
        });
      }
    };

    eventBus.on("world.scene.ready", (event) => emittedEvents.push(event.type));

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await Promise.resolve();
    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    resolveRestartSceneLoad?.({
      canvas: document.createElement("canvas"),
      dispose: () => {
        host.querySelector('[data-testid="world-ready-scene"]')?.remove();
      }
    });

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(emittedEvents).toEqual(["world.scene.ready"]);
    expect(host.querySelector('[data-testid="world-ready-scene"]')).toBeNull();
  });
});
