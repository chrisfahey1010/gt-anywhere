import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldAudioRuntime, WorldAudioTelemetry } from "../../src/audio/world-audio-runtime";
import { GameEventBus } from "../../src/app/events/game-events";
import type { PlayerSettings } from "../../src/app/config/settings-schema";
import { createLogger, type LogEntry } from "../../src/app/logging/logger";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { WorldNavigationSnapshot } from "../../src/rendering/scene/world-scene-runtime";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import type { PlayerSettingsRepository } from "../../src/persistence/settings/local-storage-player-settings-repository";
import type { HeatRuntimeSnapshot } from "../../src/sandbox/heat/heat-runtime";
import { validLocationQuery } from "../fixtures/location-queries";

describe("app bootstrap smoke", () => {
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
        displayName: "Market Street",
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

  it("boots to the location shell and reaches a slice-ready state on a valid submission", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let currentNow = 100;
    const eventBus = new GameEventBus();
    let readyMilestone: string | null = null;
    let readyCount = 0;
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
        renderHost.innerHTML =
          '<div data-testid="world-ready-scene" data-ready-milestone="controllable-vehicle">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.scene.ready", (event) => {
      readyMilestone = event.readinessMilestone;
      readyCount += 1;
    });

    const app = await createGameApp({
      host,
      eventBus,
      now: () => {
        const value = currentNow;
        currentNow += 25;
        return value;
      },
      sliceGenerator,
      sceneLoader
    });
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    expect(Number(renderHost.dataset.shellReadyAtMs ?? "0")).toBeGreaterThan(0);
    expect(renderHost.dataset.worldManifestReadyAtMs).toBeUndefined();
    expect(renderHost.dataset.worldSceneReadyAtMs).toBeUndefined();

    expect(host.textContent).toContain("Enter a real-world location");

    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const firstManifestReadyAtMs = Number(renderHost.dataset.worldManifestReadyAtMs ?? "0");
    const firstSceneReadyAtMs = Number(renderHost.dataset.worldSceneReadyAtMs ?? "0");

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(host.textContent).toContain("Slice ready");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).not.toBeNull();
    expect(host.querySelector('[data-ready-milestone="controllable-vehicle"]')).not.toBeNull();
    expect(receivedSpawnCandidate).toMatchObject({
      id: "spawn-0",
      roadId: "market-st",
      starterVehicle: {
        kind: "starter-car"
      }
    });
    expect(readyMilestone).toBe("controllable-vehicle");
    expect(readyCount).toBe(1);
    expect(firstManifestReadyAtMs).toBeGreaterThan(Number(renderHost.dataset.shellReadyAtMs ?? "0"));
    expect(firstSceneReadyAtMs).toBeGreaterThan(firstManifestReadyAtMs);
    expect(Number(renderHost.dataset.worldManifestDurationMs ?? "0")).toBeGreaterThan(0);
    expect(Number(renderHost.dataset.worldSceneDurationMs ?? "0")).toBeGreaterThan(0);

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(host.textContent).toContain("Slice ready");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).not.toBeNull();
    expect(readyMilestone).toBe("controllable-vehicle");
    expect(readyCount).toBe(2);
    expect(Number(renderHost.dataset.worldManifestReadyAtMs ?? "0")).toBeGreaterThan(firstManifestReadyAtMs);
    expect(Number(renderHost.dataset.worldSceneReadyAtMs ?? "0")).toBeGreaterThan(firstSceneReadyAtMs);
    expect(renderHost.dataset.worldLoadFailedAtMs).toBeUndefined();
  });

  it("rehydrates saved settings across app recreation without breaking the ready-to-restart loop", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let storedSettings: PlayerSettings | null = null;
    const repository: PlayerSettingsRepository = {
      load: () => storedSettings,
      save: (settings) => {
        storedSettings = settings;
        return true;
      }
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, settings }) => {
        const canvas = document.createElement("canvas");
        canvas.dataset.readyMilestone = "controllable-vehicle";
        canvas.dataset.settingsGraphicsPreset = settings.graphicsPreset;
        canvas.dataset.settingsWorldSize = settings.worldSize;
        renderHost.replaceChildren(canvas);

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const firstApp = await createGameApp({
      host,
      sceneLoader,
      settingsRepository: repository,
      sliceGenerator
    });

    (host.querySelector('[data-testid="world-size-large"]') as HTMLButtonElement).click();
    (host.querySelector('[data-testid="open-settings"]') as HTMLButtonElement).click();

    const graphicsPreset = host.querySelector('[data-testid="settings-graphics-preset"]') as HTMLSelectElement;

    graphicsPreset.value = "low";
    graphicsPreset.dispatchEvent(new Event("change", { bubbles: true }));
    (host.querySelector('[data-testid="apply-settings"]') as HTMLButtonElement).click();

    firstApp.destroy();

    const secondApp = await createGameApp({
      host,
      sceneLoader,
      settingsRepository: repository,
      sliceGenerator
    });

    expect((host.querySelector('[data-testid="world-size-large"]') as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");

    (host.querySelector('[data-testid="open-settings"]') as HTMLButtonElement).click();
    expect((host.querySelector('[data-testid="settings-graphics-preset"]') as HTMLSelectElement).value).toBe("low");

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await secondApp.whenIdle();

    const canvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(secondApp.getSnapshot().phase).toBe("world-ready");
    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.settingsWorldSize).toBe("large");
    expect(canvas.dataset.settingsGraphicsPreset).toBe("low");
  });

  it("lets the player hide and restore the session setup overlay with H during world-ready", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
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
    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const shellHost = host.querySelector(".world-shell-host") as HTMLDivElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(shellHost.hidden).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, code: "KeyH" }));
    expect(shellHost.hidden).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, code: "KeyH" }));
    expect(shellHost.hidden).toBe(false);
  });

  it("wires audio runtime telemetry through world-ready, canvas updates, and restart cleanup", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const listeners = new Set<(telemetry: WorldAudioTelemetry) => void>();
    let telemetry: WorldAudioTelemetry = {
      ambienceEnabled: true,
      available: true,
      cueCount: 0,
      lastCue: "none",
      mood: "inactive",
      profile: "medium",
      unlockState: "uninitialized",
      vehiclePresence: "none"
    };
    const updateTelemetry = (changes: Partial<WorldAudioTelemetry>): void => {
      telemetry = {
        ...telemetry,
        ...changes
      };
      listeners.forEach((listener) => {
        listener(telemetry);
      });
    };
    const audioRuntime: WorldAudioRuntime = {
      dispose: vi.fn(),
      getTelemetry: () => telemetry,
      handleChaosEventTypes: vi.fn((eventTypes: readonly string[]) => {
        if (eventTypes.length === 0) {
          return;
        }

        updateTelemetry({
          cueCount: telemetry.cueCount + eventTypes.length,
          lastCue: eventTypes[eventTypes.length - 1] === "vehicle.damaged" ? "impact.vehicle" : "impact.prop"
        });
      }),
      handleCombatEvents: vi.fn(),
      handleHeat: vi.fn(({ snapshot }: { snapshot: HeatRuntimeSnapshot }) => {
        updateTelemetry({
          mood: snapshot.stage
        });
      }),
      onTelemetryChanged: (listener) => {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
      resetWorld: vi.fn(() => {
        updateTelemetry({
          cueCount: 0,
          lastCue: "none",
          mood: "inactive",
          vehiclePresence: "none"
        });
      }),
      setPolishProfile: vi.fn((profile) => {
        updateTelemetry({
          ambienceEnabled: profile.ambienceEnabled,
          profile: profile.profile
        });
      }),
      setWorldState: vi.fn((state: { activeVehicleType: string | null; possessionMode: "vehicle" | "on-foot" | null; worldReady: boolean }) => {
        updateTelemetry({
          vehiclePresence:
            state.worldReady && state.possessionMode === "vehicle" ? (state.activeVehicleType ?? "vehicle") : "none"
        });
      }),
      unlock: vi.fn(async () => {
        updateTelemetry({
          unlockState: "unlocked"
        });
      })
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    type TestHeatListener = (options: {
      events: Array<{
        nextLevel: number;
        nextStage: "calm" | "watch" | "elevated" | "high" | "critical";
        previousLevel: number;
        previousStage: "calm" | "watch" | "elevated" | "high" | "critical";
        snapshot: HeatRuntimeSnapshot;
        timestampSeconds: number;
        type: "heat.level.changed";
      }>;
      snapshot: HeatRuntimeSnapshot;
    }) => void;
    let emitHeat: TestHeatListener | null = null;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        const canvas = document.createElement("canvas");

        canvas.dataset.activeVehicleType = "sedan";
        canvas.dataset.chaosRecentEvents = "";
        canvas.dataset.possessionMode = "vehicle";
        canvas.dataset.readyMilestone = "controllable-vehicle";
        renderHost.replaceChildren(canvas);

        return {
          canvas,
          subscribeHeat: (listener) => {
            emitHeat = listener as TestHeatListener;
            listener({
              events: [],
              snapshot: createHeatSnapshot()
            });

            return () => {
              emitHeat = null;
            };
          },
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const app = await createGameApp({ host, audioRuntime, sceneLoader, sliceGenerator });
    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const canvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(canvas.dataset.audioVehiclePresence).toBe("sedan");
    expect(canvas.dataset.audioMood).toBe("calm");

    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, code: "KeyW" }));
    expect(canvas.dataset.audioUnlockState).toBe("unlocked");

    expect(emitHeat).not.toBeNull();
    (emitHeat as unknown as TestHeatListener)({
      events: [
        {
          nextLevel: 2,
          nextStage: "elevated",
          previousLevel: 0,
          previousStage: "calm",
          snapshot: createHeatSnapshot({ level: 2, responderCount: 1, score: 24, stage: "elevated" }),
          timestampSeconds: 2,
          type: "heat.level.changed"
        }
      ],
      snapshot: createHeatSnapshot({ level: 2, responderCount: 1, score: 24, stage: "elevated" })
    });
    expect(canvas.dataset.audioMood).toBe("elevated");

    canvas.dataset.chaosRecentEvents = "vehicle.damaged";
    await Promise.resolve();
    await Promise.resolve();
    expect(canvas.dataset.audioCueCount).toBe("1");
    expect(canvas.dataset.audioLastCue).toBe("impact.vehicle");

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    const restartedCanvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(restartedCanvas.dataset.audioCueCount).toBe("0");
    expect(restartedCanvas.dataset.audioMood).toBe("calm");
    expect(restartedCanvas.dataset.audioVehiclePresence).toBe("sedan");
    expect(audioRuntime.resetWorld).toHaveBeenCalled();
  });

  it("reuses chaos telemetry for impact feedback and clears the pulse on restart", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        const canvas = document.createElement("canvas");

        canvas.dataset.chaosRecentEvents = "";
        canvas.dataset.possessionMode = "vehicle";
        canvas.dataset.readyMilestone = "controllable-vehicle";
        renderHost.replaceChildren(canvas);

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const app = await createGameApp({ host, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const canvas = host.querySelector("canvas") as HTMLCanvasElement;
    const combatHud = host.querySelector('[data-testid="world-combat-hud"]') as HTMLElement;

    canvas.dataset.chaosRecentEvents = "vehicle.damaged";
    await Promise.resolve();
    await Promise.resolve();

    expect(combatHud.classList.contains("world-combat-hud--impact")).toBe(true);

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(combatHud.classList.contains("world-combat-hud--impact")).toBe(false);
  });

  it("surfaces degraded browser support through shell copy, datasets, and typed ready telemetry", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    const logEntries: LogEntry[] = [];
    const browserSupportIssues = [
      "browser-family-concessions",
      "audio-blocked",
      "storage-unavailable",
      "request-idle-callback-unavailable"
    ];
    let shellSupportTier: string | null = null;
    let sceneSupportTier: string | null = null;
    let sceneSupportIssues: string[] = [];
    const audioTelemetry: WorldAudioTelemetry = {
      ambienceEnabled: true,
      available: true,
      cueCount: 0,
      lastCue: "none",
      mood: "inactive",
      profile: "medium",
      unlockState: "blocked",
      vehiclePresence: "none"
    };
    const audioRuntime: WorldAudioRuntime = {
      dispose: vi.fn(),
      getTelemetry: () => audioTelemetry,
      handleChaosEventTypes: vi.fn(),
      handleCombatEvents: vi.fn(),
      handleHeat: vi.fn(),
      onTelemetryChanged: () => () => {},
      resetWorld: vi.fn(),
      setPolishProfile: vi.fn(),
      setWorldState: vi.fn(),
      unlock: vi.fn(async () => undefined)
    };
    const settingsRepository: PlayerSettingsRepository = {
      getStorageAvailability: () => "unavailable",
      load: () => null,
      save: () => false
    } as PlayerSettingsRepository;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ browserSupport, renderHost }) => {
        expect(browserSupport).toMatchObject({
          issues: browserSupportIssues,
          supportTier: "degraded"
        });

        const canvas = document.createElement("canvas");

        renderHost.replaceChildren(canvas);

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("app.shell.ready", (event) => {
      shellSupportTier = event.browserSupport.supportTier;
    });
    eventBus.on("world.scene.ready", (event) => {
      sceneSupportTier = event.browserSupport.supportTier;
      sceneSupportIssues = event.browserSupport.issues;
    });

    const app = await createGameApp({
      audioRuntime,
      browserEnvironmentCapabilities: {
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: false,
        webgl2: true
      },
      eventBus,
      host,
      logger: createLogger((entry) => {
        logEntries.push(entry);
      }),
      platformSignals: {
        browserFamily: "firefox",
        deviceMemoryGiB: 16,
        hardwareConcurrency: 16
      },
      sceneLoader,
      settingsRepository,
      sliceGenerator
    });
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;

    expect(host.textContent).toContain("Browser support: degraded");
    expect(renderHost.dataset.browserSupportTier).toBe("degraded");
    expect(renderHost.dataset.browserSupportIssues).toBe(browserSupportIssues.join(","));

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const canvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(canvas.dataset.browserSupportTier).toBe("degraded");
    expect(canvas.dataset.browserSupportIssues).toBe(browserSupportIssues.join(","));
    expect(shellSupportTier).toBe("degraded");
    expect(sceneSupportTier).toBe("degraded");
    expect(sceneSupportIssues).toEqual(browserSupportIssues);
    expect(logEntries.find((entry) => entry.eventName === "app.shell.ready")?.context).toMatchObject({
      browserSupport: {
        supportTier: "degraded"
      }
    });
    expect(logEntries.find((entry) => entry.eventName === "world.scene.ready")?.context).toMatchObject({
      browserSupport: {
        supportTier: "degraded"
      }
    });
  });

  it("fails soft with a public-build reload path when a stale lazy chunk is detected", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        const canvas = document.createElement("canvas");

        canvas.dataset.readyMilestone = "controllable-vehicle";
        renderHost.replaceChildren(canvas);

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const reloadPage = vi.fn();
    const app = await createGameApp({ host, reloadPage, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const staleChunkEvent = new Event("vite:preloadError", { cancelable: true }) as Event & { payload?: unknown };
    staleChunkEvent.payload = new Error("Failed to fetch dynamically imported module");
    window.dispatchEvent(staleChunkEvent);

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(host.textContent).toContain("newer public build is available");
    expect(host.querySelector('[data-testid="reload-public-build"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="retry-load"]')).toBeNull();

    (host.querySelector('[data-testid="reload-public-build"]') as HTMLButtonElement).click();
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("fails soft with supported-browser guidance when the baseline browser support is unsupported", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let failureCode: string | null = null;
    let failureReason: string | null = null;
    const sliceGenerator: WorldSliceGenerator = {
      generate: vi.fn(async () => ({
        ok: true as const,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      }))
    };
    const sceneLoader: WorldSceneLoader = {
      load: vi.fn(async ({ renderHost }) => {
        const canvas = document.createElement("canvas");

        renderHost.replaceChildren(canvas);

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      })
    };

    eventBus.on("world.load.failed", (event) => {
      failureCode = event.failure.code;
      failureReason = String(event.failure.details.reason ?? "");
      expect(event.browserSupport.supportTier).toBe("unsupported");
    });

    const app = await createGameApp({
      browserEnvironmentCapabilities: {
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: true,
        webgl2: false
      },
      eventBus,
      host,
      platformSignals: {
        browserFamily: "unknown",
        deviceMemoryGiB: 8,
        hardwareConcurrency: 8
      },
      sceneLoader,
      sliceGenerator
    });
    const renderHost = host.querySelector('[data-testid="render-host"]') as HTMLDivElement;
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(app.getSnapshot().error).toMatchObject({
      code: "UNSUPPORTED_BROWSER",
      stage: "browser-support"
    });
    expect(host.textContent).toContain("supported desktop browser");
    expect(host.textContent).toContain("WebGL2");
    expect(renderHost.dataset.browserSupportTier).toBe("unsupported");
    expect(Number(renderHost.dataset.worldLoadFailedAtMs ?? "0")).toBeGreaterThan(0);
    expect(sliceGenerator.generate).not.toHaveBeenCalled();
    expect(sceneLoader.load).not.toHaveBeenCalled();
    expect(failureCode).toBe("UNSUPPORTED_BROWSER");
    expect(failureReason).toBe("webgl2-unavailable");
  });

  it("keeps the controllable-vehicle baseline and possession indicator coherent across restart", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let readyMilestone: string | null = null;
    let readyCount = 0;
    let activeSceneCanvas: HTMLCanvasElement | null = null;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        const canvas = document.createElement("canvas");
        canvas.dataset.readyMilestone = "controllable-vehicle";
        canvas.dataset.possessionMode = "vehicle";
        canvas.dataset.activeCamera = "starter-vehicle-camera";
        canvas.dataset.testid = "world-scene-canvas";
        renderHost.replaceChildren(canvas);
        activeSceneCanvas = canvas;

        return {
          canvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.scene.ready", (event) => {
      readyMilestone = event.readinessMilestone;
      readyCount += 1;
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    if (activeSceneCanvas === null) {
      throw new Error("Expected scene canvas to be created");
    }

    const sceneCanvas: HTMLCanvasElement = activeSceneCanvas;

    expect(sceneCanvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(sceneCanvas.dataset.possessionMode).toBe("vehicle");

    sceneCanvas.dataset.possessionMode = "on-foot";
    expect(sceneCanvas.dataset.possessionMode).toBe("on-foot");

    sceneCanvas.dataset.possessionMode = "vehicle";
    sceneCanvas.dataset.activeCamera = "on-foot-camera";
    sceneCanvas.dataset.activeCamera = "starter-vehicle-camera";
    expect(sceneCanvas.dataset.possessionMode).toBe("vehicle");

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    if (activeSceneCanvas === null) {
      throw new Error("Expected restarted scene canvas to be created");
    }

    const restartedSceneCanvas: HTMLCanvasElement = activeSceneCanvas;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(restartedSceneCanvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(restartedSceneCanvas.dataset.possessionMode).toBe("vehicle");
    expect(restartedSceneCanvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(readyMilestone).toBe("controllable-vehicle");
    expect(readyCount).toBe(2);
  });

  it("renders a non-blocking navigation HUD and refreshes its label and marker across restart", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    let loadCount = 0;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        loadCount += 1;
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        const navigationSnapshot: WorldNavigationSnapshot =
          loadCount === 1
            ? {
                actor: {
                  position: { x: 20, y: 1.7, z: -16 },
                  facingYaw: Math.PI / 2,
                  possessionMode: "vehicle"
                },
                bounds: manifest.bounds,
                districtName: "Downtown",
                locationName: "San Francisco, CA",
                roads: [
                  {
                    id: "market-st",
                    displayName: "Market Street",
                    kind: "primary",
                    width: 18,
                    points: [
                      { x: -280, z: -220 },
                      { x: 280, z: 220 }
                    ]
                  }
                ],
                streetLabel: "Market Street"
              }
            : {
                actor: {
                  position: { x: -24, y: 1.7, z: 18 },
                  facingYaw: 0,
                  possessionMode: "vehicle"
                },
                bounds: manifest.bounds,
                districtName: "Downtown",
                locationName: "San Francisco, CA",
                roads: [
                  {
                    id: "mission-st",
                    displayName: "Mission Street",
                    kind: "secondary",
                    width: 14,
                    points: [
                      { x: -240, z: -40 },
                      { x: 240, z: 40 }
                    ]
                  }
                ],
                streetLabel: "Mission Street"
              };

        return {
          canvas: document.createElement("canvas"),
          subscribeNavigation: (listener) => {
            listener(navigationSnapshot);

            return () => {};
          },
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    const app = await createGameApp({ host, sliceGenerator, sceneLoader });
    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;
    const marker = hud.querySelector('[data-testid="world-navigation-marker"]') as SVGCircleElement;
    const firstMarkerX = marker.getAttribute("cx");
    const firstMarkerY = marker.getAttribute("cy");

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(hud.hidden).toBe(false);
    expect(hud.style.pointerEvents).toBe("none");
    expect(hud.textContent).toContain("Market Street");
    expect(hud.querySelector('[data-testid="world-navigation-minimap"]')).not.toBeNull();

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(loadCount).toBe(2);
    expect(hud.textContent).toContain("Mission Street");
    expect(marker.getAttribute("cx")).not.toBe(firstMarkerX);
    expect(marker.getAttribute("cy")).not.toBe(firstMarkerY);
  });

  it("replays into the selected starter vehicle, refreshes HUD state, and keeps plain restart on the baseline path", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let readyCount = 0;
    let activeSceneCanvas: HTMLCanvasElement | null = null;
    let loadCount = 0;
    const loadRecords: Array<{ replaySelectionId: string | null; starterVehicleType: string | null }> = [];
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, replaySelection, starterVehicleType }) => {
        loadCount += 1;
        loadRecords.push({
          replaySelectionId: replaySelection?.id ?? null,
          starterVehicleType: starterVehicleType ?? null
        });

        const canvas = document.createElement("canvas");
        canvas.dataset.readyMilestone = "controllable-vehicle";
        canvas.dataset.possessionMode = "vehicle";
        canvas.dataset.activeCamera = "starter-vehicle-camera";
        canvas.dataset.activeVehicleType = starterVehicleType ?? "sedan";
        canvas.dataset.testid = "world-scene-canvas";
        renderHost.replaceChildren(canvas);
        activeSceneCanvas = canvas;

        const navigationSnapshot: WorldNavigationSnapshot =
          loadCount === 1
            ? {
                actor: {
                  position: { x: 20, y: 1.7, z: -16 },
                  facingYaw: Math.PI / 2,
                  possessionMode: "vehicle"
                },
                bounds: manifest.bounds,
                districtName: "Downtown",
                locationName: "San Francisco, CA",
                roads: [
                  {
                    id: "market-st",
                    displayName: "Market Street",
                    kind: "primary",
                    width: 18,
                    points: [
                      { x: -280, z: -220 },
                      { x: 280, z: 220 }
                    ]
                  }
                ],
                streetLabel: "Market Street"
              }
            : loadCount === 2
              ? {
                  actor: {
                    position: { x: -24, y: 1.7, z: 18 },
                    facingYaw: 0,
                    possessionMode: "vehicle"
                  },
                  bounds: manifest.bounds,
                  districtName: "Downtown",
                  locationName: "San Francisco, CA",
                  roads: [
                    {
                      id: "mission-st",
                      displayName: "Mission Street",
                      kind: "secondary",
                      width: 14,
                      points: [
                        { x: -240, z: -40 },
                        { x: 240, z: 40 }
                      ]
                    }
                  ],
                  streetLabel: "Mission Street"
                }
              : {
                  actor: {
                    position: { x: 16, y: 1.7, z: 10 },
                    facingYaw: Math.PI / 4,
                    possessionMode: "vehicle"
                  },
                  bounds: manifest.bounds,
                  districtName: "Downtown",
                  locationName: "San Francisco, CA",
                  roads: [
                    {
                      id: "battery-st",
                      displayName: "Battery Street",
                      kind: "tertiary",
                      width: 12,
                      points: [
                        { x: -180, z: -60 },
                        { x: 180, z: 60 }
                      ]
                    }
                  ],
                  streetLabel: "Battery Street"
                };

        return {
          canvas,
          subscribeNavigation: (listener) => {
            listener(navigationSnapshot);

            return () => {};
          },
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.scene.ready", () => {
      readyCount += 1;
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    if (activeSceneCanvas === null) {
      throw new Error("Expected initial scene canvas to be created");
    }

    const hud = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;
    const initialCanvas = activeSceneCanvas as HTMLCanvasElement;

    expect(initialCanvas.dataset.activeVehicleType).toBe("sedan");
    expect(hud.textContent).toContain("Market Street");

    initialCanvas.dataset.possessionMode = "on-foot";
    initialCanvas.dataset.activeCamera = "on-foot-camera";

    (host.querySelector('[data-testid="replay-vehicle-heavy-truck"]') as HTMLButtonElement).click();
    await app.whenIdle();

    if (activeSceneCanvas === null) {
      throw new Error("Expected replay scene canvas to be created");
    }

    const replayCanvas = activeSceneCanvas as HTMLCanvasElement;

    expect(replayCanvas).not.toBe(initialCanvas);
    expect(replayCanvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(replayCanvas.dataset.possessionMode).toBe("vehicle");
    expect(replayCanvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(replayCanvas.dataset.activeVehicleType).toBe("heavy-truck");
    expect(hud.textContent).toContain("Mission Street");
    expect(app.getSnapshot().replaySelection).toMatchObject({
      id: "vehicle-heavy-truck"
    });

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    if (activeSceneCanvas === null) {
      throw new Error("Expected restarted scene canvas to be created");
    }

    const restartedCanvas = activeSceneCanvas as HTMLCanvasElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(app.getSnapshot().replaySelection).toBeNull();
    expect(restartedCanvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(restartedCanvas.dataset.possessionMode).toBe("vehicle");
    expect(restartedCanvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(restartedCanvas.dataset.activeVehicleType).toBe("sedan");
    expect(hud.textContent).toContain("Battery Street");
    expect(loadRecords).toEqual([
      {
        replaySelectionId: null,
        starterVehicleType: null
      },
      {
        replaySelectionId: "vehicle-heavy-truck",
        starterVehicleType: "heavy-truck"
      },
      {
        replaySelectionId: null,
        starterVehicleType: null
      }
    ]);
    expect(readyCount).toBe(3);
  });
});
