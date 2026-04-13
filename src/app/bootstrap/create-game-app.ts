import { GameEventBus } from "../events/game-events";
import { createWorldAudioRuntime, type WorldAudioRuntime, type WorldAudioTelemetry } from "../../audio/world-audio-runtime";
import {
  readBrowserEnvironmentCapabilities,
  readBrowserPlatformSignals,
  resolveAudioPolishProfile,
  resolveBrowserSupportSnapshot,
  resolveCapabilityDefaultPlayerSettings,
  type BrowserEnvironmentCapabilities,
  type BrowserSupportIssue,
  type BrowserSupportSnapshot,
  type PlatformSignalSnapshot
} from "../config/platform";
import { createSceneBrowserSupportTelemetry } from "../config/browser-support-telemetry";
import { applyReleaseMetadataDataset, type ReleaseMetadata } from "../config/release-metadata";
import type { ReplaySelection } from "../config/replay-options";
import type { PlayerSettings } from "../config/settings-schema";
import { createLogger, type Logger } from "../logging/logger";
import {
  LocalStoragePlayerSettingsRepository,
  type PlayerSettingsRepository
} from "../../persistence/settings/local-storage-player-settings-repository";
import { shouldHandleQuickRestartShortcut } from "./quick-restart-shortcut";
import {
  createInitialSessionState,
  transitionSessionState,
  type SessionState
} from "../state/session-state-machine";
import { LocationEntryScreen } from "../../ui/shell/location-entry-screen";
import { WorldNavigationHud } from "../../ui/hud/world-navigation-hud";
import { WorldCombatHud } from "../../ui/hud/world-combat-hud";
import { WorldHeatHud } from "../../ui/hud/world-heat-hud";
import {
  createWorldGenerationRequest,
  LocationResolver,
  type LocationResolveFailure,
  type WorldGenerationRequest
} from "../../world/generation/location-resolver";
import {
  createWorldLoadFailure,
  isWorldSceneRuntimeError,
  type WorldLoadFailure
} from "../../world/generation/world-load-failure";
import { DefaultWorldSliceGenerator, type WorldSliceGenerator } from "../../world/generation/world-slice-generator";
import type { SliceManifest, SpawnCandidate } from "../../world/chunks/slice-manifest";
import type { WorldSceneHandle, WorldSceneLoader } from "../../rendering/scene/create-world-scene";
import type { CombatEvent } from "../../sandbox/combat/combat-runtime";
import type { HeatRuntimeSnapshot } from "../../sandbox/heat/heat-runtime";
import type { RunOutcomeSnapshot } from "../../sandbox/reset/run-outcome-runtime";

export interface CreateGameAppOptions {
  browserEnvironmentCapabilities?: BrowserEnvironmentCapabilities;
  host: HTMLElement;
  capabilityDefaults?: PlayerSettings;
  logger?: Logger;
  resolver?: LocationResolver;
  scheduleBackgroundTask?: (task: () => void) => void;
  settingsRepository?: PlayerSettingsRepository;
  eventBus?: GameEventBus;
  sliceGenerator?: WorldSliceGenerator;
  sceneLoader?: WorldSceneLoader;
  sceneLoaderFactory?: () => Promise<WorldSceneLoader>;
  audioRuntime?: WorldAudioRuntime;
  clock?: () => string;
  now?: () => number;
  platformSignals?: PlatformSignalSnapshot;
  reloadPage?: () => void;
}

export interface GameApp {
  getSnapshot(): SessionState;
  whenIdle(): Promise<void>;
  destroy(): void;
}

const DEFAULT_INJECTED_LOADER_PLATFORM_SIGNALS: PlatformSignalSnapshot = {
  browserFamily: "chromium",
  deviceMemoryGiB: 8,
  hardwareConcurrency: 8
};

function getDefaultNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function formatTelemetryMs(value: number): string {
  return value.toFixed(2);
}

function scheduleDefaultBackgroundTask(task: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      task();
    });
    return;
  }

  setTimeout(task, 0);
}

async function createDefaultWorldSceneLoader(): Promise<WorldSceneLoader> {
  const { BabylonWorldSceneLoader } = await import("../../rendering/scene/create-world-scene");

  return new BabylonWorldSceneLoader();
}

function getStoredManifest(sliceGenerator: WorldSliceGenerator, manifest: SliceManifest): SliceManifest {
  return sliceGenerator.getStoredManifest?.(manifest.sliceId) ?? manifest;
}

function createUnexpectedResolveFailure(query: string): LocationResolveFailure {
  return {
    ok: false,
    code: "LOCATION_RESOLVE_FAILED",
    message: "The location could not be resolved right now. Try again.",
    recoverable: true,
    query
  };
}

function isPublicBuildRecoveryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return /chunkloaderror|failed to fetch dynamically imported module|importing a module script failed|unable to preload/i.test(
    message.toLowerCase()
  );
}

function createPublicBuildRecoveryFailure(placeName: string, error: unknown): WorldLoadFailure {
  return createWorldLoadFailure(
    "WORLD_SCENE_LOAD_FAILED",
    "world-loading",
    "A newer public build is available. Reload the page to update and try again.",
    placeName,
    {
      error: error instanceof Error ? error.message : String(error ?? "unknown"),
      recoveryAction: "reload",
      recoveryReason: "public-build-updated"
    }
  );
}

function createSceneLoadFailure(request: WorldGenerationRequest, error: unknown): WorldLoadFailure {
  if (isPublicBuildRecoveryError(error)) {
    return createPublicBuildRecoveryFailure(request.location.placeName, error);
  }

  if (isWorldSceneRuntimeError(error)) {
    return createWorldLoadFailure(
      error.failureCode,
      error.failureStage,
      error.message,
      request.location.placeName,
      error.failureDetails
    );
  }

  return createWorldLoadFailure(
    "WORLD_SCENE_LOAD_FAILED",
    "world-loading",
    "The world could not finish loading. Retry or edit the location.",
    request.location.placeName,
    {
      error: error instanceof Error ? error.message : String(error)
    }
  );
}

function getBlockingBrowserSupportReason(browserSupport: BrowserSupportSnapshot): BrowserSupportIssue | null {
  if (browserSupport.issues.includes("webgl2-unavailable")) {
    return "webgl2-unavailable";
  }

  if (browserSupport.issues.includes("unsupported-browser-family")) {
    return "unsupported-browser-family";
  }

  return null;
}

function createUnsupportedBrowserLoadFailure(
  request: WorldGenerationRequest,
  browserSupport: BrowserSupportSnapshot
): WorldLoadFailure {
  const reason = getBlockingBrowserSupportReason(browserSupport) ?? "unsupported-browser-family";

  return createWorldLoadFailure(
    "UNSUPPORTED_BROWSER",
    "browser-support",
    "GT Anywhere needs a supported desktop browser with WebGL2. Try current Chromium, Firefox, or Safari/WebKit.",
    request.location.placeName,
    {
      browserFamily: browserSupport.browserFamily,
      reason,
      supportIssues: browserSupport.issues,
      supportTier: browserSupport.supportTier
    }
  );
}

function applyBrowserSupportDataset(target: HTMLElement, browserSupport: BrowserSupportSnapshot): void {
  const telemetry = createSceneBrowserSupportTelemetry(browserSupport);

  Object.entries(telemetry).forEach(([key, value]) => {
    target.dataset[key] = value;
  });
}

function createAppHosts(host: HTMLElement): {
  hudHost: HTMLDivElement;
  renderHost: HTMLDivElement;
  shellHost: HTMLDivElement;
} {
  const renderHost = document.createElement("div");
  renderHost.className = "world-render-host";
  renderHost.dataset.testid = "render-host";

  const shellHost = document.createElement("div");
  shellHost.className = "world-shell-host";

  const hudHost = document.createElement("div");
  hudHost.className = "world-hud-host";

  host.replaceChildren(renderHost, hudHost, shellHost);

  return { hudHost, renderHost, shellHost };
}

function parseRecentEventTypes(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value.split(",").filter((entry) => entry.length > 0);
}

function getAppendedRecentEventTypes(previous: readonly string[], next: readonly string[]): string[] {
  const maxOverlap = Math.min(previous.length, next.length);

  for (let overlap = maxOverlap; overlap >= 0; overlap -= 1) {
    const previousSlice = previous.slice(previous.length - overlap);
    const nextSlice = next.slice(0, overlap);

    if (previousSlice.length !== nextSlice.length || previousSlice.some((eventType, index) => eventType !== nextSlice[index])) {
      continue;
    }

    return next.slice(overlap);
  }

  return [...next];
}

interface CachedWorldLoadData {
  manifest: SliceManifest;
  spawnCandidate: SpawnCandidate;
}

export async function createGameApp(options: CreateGameAppOptions): Promise<GameApp> {
  const logger = options.logger ?? createLogger();
  const releaseMetadata: ReleaseMetadata = __GT_RELEASE_METADATA__;
  const resolver = options.resolver ?? new LocationResolver();
  const reloadPage = options.reloadPage ?? (() => window.location.reload());
  const scheduleBackgroundTask = options.scheduleBackgroundTask ?? scheduleDefaultBackgroundTask;
  const settingsRepository = options.settingsRepository ?? new LocalStoragePlayerSettingsRepository();
  const eventBus = options.eventBus ?? new GameEventBus();
  const sliceGenerator = options.sliceGenerator ?? new DefaultWorldSliceGenerator();
  const sceneLoaderFactory = options.sceneLoaderFactory ?? createDefaultWorldSceneLoader;
  const audioRuntime = options.audioRuntime ?? createWorldAudioRuntime();
  const shouldEnforceBrowserSupportBaseline =
    options.browserEnvironmentCapabilities !== undefined ||
    options.platformSignals !== undefined ||
    (options.sceneLoader === undefined && options.sceneLoaderFactory === undefined);
  const platformSignals =
    options.platformSignals ??
    (shouldEnforceBrowserSupportBaseline ? readBrowserPlatformSignals() : DEFAULT_INJECTED_LOADER_PLATFORM_SIGNALS);
  const browserEnvironmentCapabilities =
    options.browserEnvironmentCapabilities ??
    readBrowserEnvironmentCapabilities({
      includeWebgl2Probe: shouldEnforceBrowserSupportBaseline
    });
  const capabilityDefaults = options.capabilityDefaults ?? resolveCapabilityDefaultPlayerSettings(platformSignals);
  const clock = options.clock ?? (() => new Date().toISOString());
  const now = options.now ?? getDefaultNow;
  const appStartedAtMs = now();
  const { hudHost, renderHost, shellHost } = createAppHosts(options.host);
  const resolveCurrentBrowserSupport = (): BrowserSupportSnapshot => {
    const audioTelemetry = audioRuntime.getTelemetry();

    return resolveBrowserSupportSnapshot({
      audioSupport: {
        available: audioTelemetry.available,
        unlockState: audioTelemetry.unlockState
      },
      capabilityDefaults,
      environmentCapabilities: browserEnvironmentCapabilities,
      signals: platformSignals,
      storageAvailable: settingsRepository.getStorageAvailability?.() !== "unavailable"
    });
  };
  let currentBrowserSupport = resolveCurrentBrowserSupport();
  const screen = new LocationEntryScreen({
    host: shellHost,
    onSubmit: handleSubmit,
    onEdit: handleEdit,
    onApplySettings: handleApplySettings,
    onReplay: handleReplay,
    onReloadPublicBuild: handleReloadPublicBuild,
    onRestart: handleRestart,
    onRetry: handleRetry,
    onSettingsChange: handleSettingsChange,
    onToggleSettings: handleToggleSettings,
    releaseMetadata
  });
  const navigationHud = new WorldNavigationHud({ host: hudHost });
  const combatHud = new WorldCombatHud({ host: hudHost });
  let heatHud: WorldHeatHud | null = null;
  let latestHeatSnapshot: HeatRuntimeSnapshot | null = null;
  let latestRunOutcomeSnapshot: RunOutcomeSnapshot | null = null;
  let shellHiddenInWorldReady = false;
  const savedSettings = settingsRepository.load();

  let state = createInitialSessionState({
    capabilityDefaults,
    savedSettings
  });
  let pendingWork = Promise.resolve();
  let activeLoadId = 0;
  let worldScene: WorldSceneHandle | null = null;
  let sceneLoader = options.sceneLoader ?? null;
  let sceneLoaderPromise: Promise<WorldSceneLoader> | null = null;
  let removeNavigationSubscription = (): void => {};
  let removeCombatSubscription = (): void => {};
  let removeHeatSubscription = (): void => {};
  let removeRunOutcomeSubscription = (): void => {};
  let disconnectAudioCanvasObserver = (): void => {};
  let removeAudioTelemetrySubscription = (): void => {};
  let activeAudioCanvas: HTMLCanvasElement | null = null;
  let lastChaosRecentEvents: string[] = [];

  currentBrowserSupport = resolveCurrentBrowserSupport();

  const clearLoadTelemetry = (): void => {
    delete renderHost.dataset.worldManifestDurationMs;
    delete renderHost.dataset.worldManifestReadyAtMs;
    delete renderHost.dataset.worldSceneDurationMs;
    delete renderHost.dataset.worldSceneReadyAtMs;
    delete renderHost.dataset.worldLoadFailedAtMs;
    delete renderHost.dataset.worldLoadFailedDurationMs;
    delete renderHost.dataset.recoveryAction;
    delete renderHost.dataset.recoveryReason;
  };

  const emitShellReadyTelemetry = (): void => {
    const shellReadyAtMs = now() - appStartedAtMs;

    currentBrowserSupport = resolveCurrentBrowserSupport();
    applyBrowserSupportDataset(renderHost, currentBrowserSupport);
    renderHost.dataset.shellReadyAtMs = formatTelemetryMs(shellReadyAtMs);
    eventBus.emit({
      type: "app.shell.ready",
      browserSupport: currentBrowserSupport,
      durationMs: shellReadyAtMs,
      phase: "location-select"
    });
    logger.info("app.shell.ready", {
      browserSupport: currentBrowserSupport,
      durationMs: shellReadyAtMs,
      phase: "location-select"
    });
  };

  const render = (): void => {
    applyBrowserSupportDataset(renderHost, currentBrowserSupport);
    applyReleaseMetadataDataset(renderHost, releaseMetadata);
    applyReleaseMetadataDataset(shellHost, releaseMetadata);
    screen.render(state, currentBrowserSupport);
    shellHost.hidden = state.phase === "world-ready" && shellHiddenInWorldReady;
    renderHost.dataset.phase = state.phase;
    navigationHud.setVisible(state.phase === "world-ready");
    combatHud.setVisible(state.phase === "world-ready");
    heatHud?.setVisible(state.phase === "world-ready");
  };

  const refreshBrowserSupport = (shouldRender: boolean): void => {
    currentBrowserSupport = resolveCurrentBrowserSupport();
    applyBrowserSupportDataset(renderHost, currentBrowserSupport);

    if (activeAudioCanvas !== null) {
      applyBrowserSupportDataset(activeAudioCanvas, currentBrowserSupport);
      applyReleaseMetadataDataset(activeAudioCanvas, releaseMetadata);
    }

    if (shouldRender) {
      render();
    }
  };

  const writeAudioTelemetryToCanvas = (telemetry: WorldAudioTelemetry): void => {
    if (activeAudioCanvas === null) {
      return;
    }

    activeAudioCanvas.dataset.audioAmbienceEnabled = String(telemetry.ambienceEnabled);
    activeAudioCanvas.dataset.audioAvailable = String(telemetry.available);
    activeAudioCanvas.dataset.audioCueCount = String(telemetry.cueCount);
    activeAudioCanvas.dataset.audioLastCue = telemetry.lastCue;
    activeAudioCanvas.dataset.audioMood = telemetry.mood;
    activeAudioCanvas.dataset.audioProfile = telemetry.profile;
    activeAudioCanvas.dataset.audioUnlockState = telemetry.unlockState;
    activeAudioCanvas.dataset.audioVehiclePresence = telemetry.vehiclePresence;
  };

  const syncAudioWorldStateFromCanvas = (canvas: HTMLCanvasElement, worldReady: boolean): void => {
    const possessionMode = canvas.dataset.possessionMode;

    audioRuntime.setWorldState({
      activeVehicleType: canvas.dataset.activeVehicleType ?? null,
      possessionMode: possessionMode === "vehicle" || possessionMode === "on-foot" ? possessionMode : null,
      worldReady
    });
    writeAudioTelemetryToCanvas(audioRuntime.getTelemetry());
  };

  const observeAudioCanvas = (canvas: HTMLCanvasElement): void => {
    disconnectAudioCanvasObserver();
    activeAudioCanvas = canvas;
    lastChaosRecentEvents = parseRecentEventTypes(canvas.dataset.chaosRecentEvents);
    syncAudioWorldStateFromCanvas(canvas, state.phase === "world-ready");
    applyBrowserSupportDataset(canvas, currentBrowserSupport);
    applyReleaseMetadataDataset(canvas, releaseMetadata);

    if (typeof MutationObserver !== "function") {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      let shouldSyncWorldState = false;

      mutations.forEach((mutation) => {
        if (mutation.type !== "attributes" || mutation.attributeName === null) {
          return;
        }

        if (mutation.attributeName === "data-chaos-recent-events") {
          const nextRecentEvents = parseRecentEventTypes(canvas.dataset.chaosRecentEvents);
          const appendedEventTypes = getAppendedRecentEventTypes(lastChaosRecentEvents, nextRecentEvents);

          lastChaosRecentEvents = nextRecentEvents;

          if (appendedEventTypes.length > 0) {
            combatHud.processImpactEventTypes(appendedEventTypes);
            audioRuntime.handleChaosEventTypes(appendedEventTypes);
          }

          return;
        }

        if (mutation.attributeName === "data-active-vehicle-type" || mutation.attributeName === "data-possession-mode") {
          shouldSyncWorldState = true;
        }
      });

      if (shouldSyncWorldState) {
        syncAudioWorldStateFromCanvas(canvas, state.phase === "world-ready");
        return;
      }

      writeAudioTelemetryToCanvas(audioRuntime.getTelemetry());
    });

    observer.observe(canvas, {
      attributeFilter: ["data-active-vehicle-type", "data-chaos-recent-events", "data-possession-mode"],
      attributes: true
    });

    disconnectAudioCanvasObserver = (): void => {
      observer.disconnect();
      disconnectAudioCanvasObserver = (): void => {};
    };
  };

  removeAudioTelemetrySubscription = audioRuntime.onTelemetryChanged((telemetry) => {
    writeAudioTelemetryToCanvas(telemetry);
    refreshBrowserSupport(false);
  });

  const handleShellVisibilityShortcut = (event: KeyboardEvent): void => {
    if (event.code !== "KeyH" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) {
      return;
    }

    if (state.phase !== "world-ready") {
      return;
    }

    event.preventDefault();
    shellHiddenInWorldReady = !shellHiddenInWorldReady;
    render();
  };

  window.addEventListener("keydown", handleShellVisibilityShortcut);

  const handlePreloadError = (event: Event & { payload?: unknown }): void => {
    if (!options.host.isConnected) {
      return;
    }

    event.preventDefault();
    enterPublicBuildRecovery(event.payload);
  };

  window.addEventListener("vite:preloadError", handlePreloadError as EventListener);

  const handleAudioUnlockGesture = (): void => {
    void audioRuntime.unlock();
  };

  window.addEventListener("keydown", handleAudioUnlockGesture);
  window.addEventListener("pointerdown", handleAudioUnlockGesture);

  const handleQuickRestartShortcut = (event: KeyboardEvent): void => {
    if (!shouldHandleQuickRestartShortcut({ event, phase: state.phase })) {
      return;
    }

    event.preventDefault();
    requestCachedRestart(null);
  };

  window.addEventListener("keydown", handleQuickRestartShortcut);

  const settlePendingWork = (work: Promise<unknown>): void => {
    pendingWork = work.then(
      () => undefined,
      () => undefined
    );
  };

  const disposeWorldScene = (): void => {
    removeNavigationSubscription();
    removeCombatSubscription();
    removeHeatSubscription();
    removeRunOutcomeSubscription();
    disconnectAudioCanvasObserver();
    removeNavigationSubscription = (): void => {};
    removeCombatSubscription = (): void => {};
    removeHeatSubscription = (): void => {};
    removeRunOutcomeSubscription = (): void => {};
    activeAudioCanvas = null;
    lastChaosRecentEvents = [];
    navigationHud.clear();
    combatHud.clear();
    heatHud?.clear();
    latestHeatSnapshot = null;
    latestRunOutcomeSnapshot = null;
    audioRuntime.resetWorld();
    worldScene?.dispose();
    worldScene = null;
    renderHost.innerHTML = "";
  };

  const requestCachedRestart = (replaySelection: ReplaySelection | null): void => {
    if (state.phase !== "world-ready" || state.sessionIdentity === null) {
      return;
    }

    persistCurrentSettings();

    const request = createWorldGenerationRequest(state.sessionIdentity, clock, state.currentSettings);
    const cachedWorldLoadData = resolveCachedWorldLoadData(request);

    state =
      replaySelection === null
        ? transitionSessionState(state, { type: "world.restart.requested", handoff: request })
        : transitionSessionState(state, { type: "world.replay.requested", handoff: request, selection: replaySelection });
    render();

    settlePendingWork(
      cachedWorldLoadData === null
        ? runGeneratedWorldLoad(request, replaySelection)
        : runCachedWorldLoad(request, cachedWorldLoadData, replaySelection)
    );
  };

  const getSceneLoader = async (): Promise<WorldSceneLoader> => {
    if (sceneLoader) {
      return sceneLoader;
    }

    sceneLoaderPromise ??= sceneLoaderFactory()
      .then((loader) => {
        sceneLoader = loader;

        return loader;
      })
      .catch((error) => {
        sceneLoaderPromise = null;
        throw error;
      });

    return sceneLoaderPromise;
  };

  const emitLoadFailure = (request: WorldGenerationRequest, failure: WorldLoadFailure, startedAtMs: number): void => {
    const completedAtMs = now();
    const durationMs = completedAtMs - startedAtMs;

    currentBrowserSupport = resolveCurrentBrowserSupport();
    applyBrowserSupportDataset(renderHost, currentBrowserSupport);
    eventBus.emit({
      type: "world.load.failed",
      browserSupport: currentBrowserSupport,
      request,
      failure,
      durationMs
    });
    logger.error("world.load.failed", {
      browserSupport: currentBrowserSupport,
      code: failure.code,
      stage: failure.stage,
      placeName: failure.placeName,
      durationMs,
      ...failure.details
    });
    renderHost.dataset.worldLoadFailedAtMs = formatTelemetryMs(completedAtMs - appStartedAtMs);
    renderHost.dataset.worldLoadFailedDurationMs = formatTelemetryMs(durationMs);
    if (typeof failure.details.recoveryAction === "string") {
      renderHost.dataset.recoveryAction = failure.details.recoveryAction;
    }
    if (typeof failure.details.recoveryReason === "string") {
      renderHost.dataset.recoveryReason = failure.details.recoveryReason;
    }

    disposeWorldScene();
    state = transitionSessionState(state, {
      type: "world.load.failed",
      failure
    });
    render();
  };

  const beginLoadAttempt = (): { startedAtMs: number; loadId: number } => {
    clearLoadTelemetry();

    return {
      startedAtMs: now(),
      loadId: ++activeLoadId
    };
  };

  const ensureSupportedBrowserOrFail = (request: WorldGenerationRequest, startedAtMs: number): boolean => {
    currentBrowserSupport = resolveCurrentBrowserSupport();
    applyBrowserSupportDataset(renderHost, currentBrowserSupport);

    if (!shouldEnforceBrowserSupportBaseline || getBlockingBrowserSupportReason(currentBrowserSupport) === null) {
      return true;
    }

    emitLoadFailure(request, createUnsupportedBrowserLoadFailure(request, currentBrowserSupport), startedAtMs);
    return false;
  };

  const emitManifestReady = (
    request: WorldGenerationRequest,
    manifest: SliceManifest,
    spawnCandidate: SpawnCandidate,
    startedAtMs: number
  ): void => {
    const completedAtMs = now();
    const manifestDurationMs = completedAtMs - startedAtMs;

    eventBus.emit({
      type: "world.manifest.ready",
      request,
      manifest,
      spawnCandidate,
      durationMs: manifestDurationMs
    });
    logger.info("world.manifest.ready", {
      placeName: request.location.placeName,
      sliceId: manifest.sliceId,
      durationMs: manifestDurationMs,
      chunkCount: manifest.chunks.length,
      roadCount: manifest.roads.length
    });
    renderHost.dataset.worldManifestReadyAtMs = formatTelemetryMs(completedAtMs - appStartedAtMs);
    renderHost.dataset.worldManifestDurationMs = formatTelemetryMs(manifestDurationMs);

    state = transitionSessionState(state, {
      type: "world.manifest.ready",
      manifest,
      spawnCandidate
    });
    render();
  };

  const loadWorldScene = async (
    request: WorldGenerationRequest,
    manifest: SliceManifest,
    spawnCandidate: SpawnCandidate,
    replaySelection: ReplaySelection | null,
    startedAtMs: number,
    loadId: number
  ): Promise<void> => {
    try {
      disposeWorldScene();
      const activeSceneLoader = await getSceneLoader();

      worldScene = await activeSceneLoader.load({
        browserSupport: currentBrowserSupport,
        renderHost,
        manifest,
        replaySelection,
        settings: request.settings,
        spawnCandidate,
        starterVehicleType: replaySelection?.starterVehicleType
      });
      audioRuntime.setPolishProfile(resolveAudioPolishProfile(request.settings.graphicsPreset, platformSignals.browserFamily));
      observeAudioCanvas(worldScene.canvas);

      removeNavigationSubscription =
        worldScene.subscribeNavigation?.((snapshot) => {
          navigationHud.render(snapshot);
        }) ?? (() => {});
      removeCombatSubscription =
        worldScene.subscribeCombat?.((options) => {
          audioRuntime.handleCombatEvents(options.events as CombatEvent[]);
          combatHud.updateWeapon(options.activeWeaponId as any);
          combatHud.processEvents(options.events);
        }) ?? (() => {});
      if (worldScene.subscribeHeat) {
        heatHud ??= new WorldHeatHud({ host: hudHost });
        removeHeatSubscription =
          worldScene.subscribeHeat((options) => {
            audioRuntime.handleHeat(options);
            latestHeatSnapshot = options.snapshot;
            heatHud?.render(options.snapshot, latestRunOutcomeSnapshot);
          }) ?? (() => {});
      }
      removeRunOutcomeSubscription =
        worldScene.subscribeRunOutcome?.((options) => {
          latestRunOutcomeSnapshot = options.snapshot;

          if (latestHeatSnapshot !== null) {
            heatHud?.render(latestHeatSnapshot, options.snapshot);
          }

          if (options.events.some((event) => event.type === "run.outcome.restart.requested")) {
            requestCachedRestart(null);
          }
        }) ?? (() => {});
      const initialNavigationSnapshot = worldScene.getNavigationSnapshot?.();

      if (initialNavigationSnapshot !== undefined) {
        navigationHud.render(initialNavigationSnapshot);
      }

      if (loadId !== activeLoadId) {
        disposeWorldScene();
        return;
      }

      const completedAtMs = now();
      const readyDurationMs = completedAtMs - startedAtMs;

      eventBus.emit({
        type: "world.scene.ready",
        browserSupport: currentBrowserSupport,
        request,
        manifest,
        durationMs: readyDurationMs,
        readinessMilestone: "controllable-vehicle"
      });
      logger.info("world.scene.ready", {
        browserSupport: currentBrowserSupport,
        placeName: request.location.placeName,
        sliceId: manifest.sliceId,
        durationMs: readyDurationMs,
        readinessMilestone: "controllable-vehicle"
      });
      renderHost.dataset.worldSceneReadyAtMs = formatTelemetryMs(completedAtMs - appStartedAtMs);
      renderHost.dataset.worldSceneDurationMs = formatTelemetryMs(readyDurationMs);

      syncAudioWorldStateFromCanvas(worldScene.canvas, true);
      state = transitionSessionState(state, { type: "world.scene.ready" });
      render();
    } catch (error) {
      if (loadId !== activeLoadId) {
        return;
      }

      emitLoadFailure(request, createSceneLoadFailure(request, error), startedAtMs);
    }
  };

  const resolveCachedWorldLoadData = (request: WorldGenerationRequest): CachedWorldLoadData | null => {
    const requestMatchesActiveHandoff = state.handoff?.compatibilityKey === request.compatibilityKey;
    const activeManifest =
      state.sliceManifest !== null && (state.sliceManifest.sliceId === request.compatibilityKey || requestMatchesActiveHandoff)
        ? state.sliceManifest
        : null;
    const storedManifest = sliceGenerator.getStoredManifest?.(request.compatibilityKey) ?? null;
    const fallbackManifest =
      storedManifest ??
      (state.sessionIdentity === null
        ? null
        : (() => {
            const byReuseKey = sliceGenerator.getStoredManifestByReuseKey?.(state.sessionIdentity.reuseKey) ?? null;

            return byReuseKey && (byReuseKey.sliceId === request.compatibilityKey || requestMatchesActiveHandoff)
              ? byReuseKey
              : null;
          })());
    const manifest = activeManifest ?? fallbackManifest;
    const spawnCandidate =
      manifest === activeManifest ? state.spawnCandidate ?? manifest?.spawnCandidates[0] ?? null : manifest?.spawnCandidates[0] ?? null;

    if (manifest === null || spawnCandidate === null) {
      return null;
    }

    return { manifest, spawnCandidate };
  };

  const runGeneratedWorldLoad = async (
    request: WorldGenerationRequest,
    replaySelection: ReplaySelection | null
  ): Promise<void> => {
    const { startedAtMs, loadId } = beginLoadAttempt();

    if (!ensureSupportedBrowserOrFail(request, startedAtMs)) {
      return;
    }

    eventBus.emit({ type: "world.generation.started", request });
    logger.info("world.generation.started", {
      placeName: request.location.placeName,
      sessionKey: request.location.sessionKey,
      sliceSeed: request.sliceSeed
    });

    state = transitionSessionState(state, { type: "world.generation.started" });
    render();

    const result = await sliceGenerator.generate(request);

    if (loadId !== activeLoadId) {
      return;
    }

    if (!result.ok) {
      emitLoadFailure(request, result, startedAtMs);
      return;
    }

    const manifest = getStoredManifest(sliceGenerator, result.manifest);

    emitManifestReady(request, manifest, result.spawnCandidate, startedAtMs);
    await loadWorldScene(request, manifest, result.spawnCandidate, replaySelection, startedAtMs, loadId);
  };

  const runCachedWorldLoad = async (
    request: WorldGenerationRequest,
    cachedWorldLoadData: CachedWorldLoadData,
    replaySelection: ReplaySelection | null
  ): Promise<void> => {
    const { startedAtMs, loadId } = beginLoadAttempt();

    if (!ensureSupportedBrowserOrFail(request, startedAtMs)) {
      return;
    }

    emitManifestReady(request, cachedWorldLoadData.manifest, cachedWorldLoadData.spawnCandidate, startedAtMs);
    await loadWorldScene(
      request,
      cachedWorldLoadData.manifest,
      cachedWorldLoadData.spawnCandidate,
      replaySelection,
      startedAtMs,
      loadId
    );
  };

  const finishSuccess = async (handoff: WorldGenerationRequest): Promise<void> => {
    eventBus.emit({ type: "session.location.resolved", identity: handoff.location });
    logger.info("session.location.resolved", {
      placeName: handoff.location.placeName,
      sessionKey: handoff.location.sessionKey
    });

    eventBus.emit({ type: "world.generation.requested", request: handoff });
    logger.info("world.generation.requested", {
      placeName: handoff.location.placeName,
      sliceSeed: handoff.sliceSeed,
      pipeline: handoff.pipeline
    });

    state = transitionSessionState(state, {
      type: "location.resolve.succeeded",
      identity: handoff.location,
      handoff
    });
    render();

    await runGeneratedWorldLoad(handoff, null);
  };

  const finishFailure = (query: string, failure: LocationResolveFailure): void => {
    eventBus.emit({ type: "session.location.resolve-failed", failure, query });
    logger.warn("session.location.resolve-failed", {
      code: failure.code,
      message: failure.message,
      query
    });

    state = transitionSessionState(state, {
      type: "location.resolve.failed",
      query,
      failure
    });
    render();
  };

  const enterPublicBuildRecovery = (error: unknown): void => {
    const failure = createPublicBuildRecoveryFailure(state.sessionIdentity?.placeName ?? "", error);

    if (state.handoff !== null) {
      emitLoadFailure(state.handoff, failure, now());
      return;
    }

    clearLoadTelemetry();
    renderHost.dataset.worldLoadFailedAtMs = formatTelemetryMs(now() - appStartedAtMs);
    renderHost.dataset.worldLoadFailedDurationMs = formatTelemetryMs(0);
    renderHost.dataset.recoveryAction = "reload";
    renderHost.dataset.recoveryReason = "public-build-updated";
    disposeWorldScene();
    state = transitionSessionState(state, {
      type: "world.load.failed",
      failure
    });
    render();
  };

  function handleEdit(): void {
    activeLoadId += 1;
    disposeWorldScene();
    clearLoadTelemetry();
    state = transitionSessionState(state, { type: "location.edit.requested" });
    render();
  }

  function handleRetry(): void {
    if (state.phase !== "world-load-error" || state.handoff === null) {
      return;
    }

    persistCurrentSettings();

    const request = createWorldGenerationRequest(state.handoff.location, clock, state.currentSettings);
    const cachedWorldLoadData = resolveCachedWorldLoadData(request);

    state = transitionSessionState(state, { type: "world.retry.requested", handoff: request });
    render();

    settlePendingWork(
      cachedWorldLoadData === null
        ? runGeneratedWorldLoad(request, state.replaySelection)
        : runCachedWorldLoad(request, cachedWorldLoadData, state.replaySelection)
    );
  }

  function handleRestart(): void {
    requestCachedRestart(null);
  }

  function handleReloadPublicBuild(): void {
    reloadPage();
  }

  function handleReplay(selection: ReplaySelection): void {
    requestCachedRestart(selection);
  }

  function handleToggleSettings(): void {
    if (
      state.phase === "location-resolving" ||
      state.phase === "world-generation-requested" ||
      state.phase === "world-generating" ||
      state.phase === "world-restarting" ||
      state.phase === "world-loading"
    ) {
      return;
    }

    state = transitionSessionState(state, { type: "settings.panel.toggled" });
    render();
  }

  function handleSettingsChange(changes: Partial<PlayerSettings>): void {
    if (
      state.phase === "location-resolving" ||
      state.phase === "world-generation-requested" ||
      state.phase === "world-generating" ||
      state.phase === "world-restarting" ||
      state.phase === "world-loading"
    ) {
      return;
    }

    state = transitionSessionState(state, {
      type: "settings.changed",
      changes
    });
    render();
  }

  function persistCurrentSettings(): void {
    if (settingsRepository.save(state.currentSettings)) {
      state = transitionSessionState(state, {
        type: "settings.applied",
        savedSettings: state.currentSettings
      });
      refreshBrowserSupport(false);
      render();
      return;
    }

    refreshBrowserSupport(true);
  }

  function handleApplySettings(): void {
    persistCurrentSettings();
  }

  function handleSubmit(query: string): void {
    if (
      state.phase === "location-resolving" ||
      state.phase === "world-generation-requested" ||
      state.phase === "world-generating" ||
      state.phase === "world-restarting" ||
      state.phase === "world-loading"
    ) {
      return;
    }

    persistCurrentSettings();

    const requestId = activeLoadId + 1;

    activeLoadId = requestId;
    disposeWorldScene();

    eventBus.emit({ type: "session.location.submitted", query });
    logger.info("session.location.submitted", { query });

    state = transitionSessionState(state, { type: "location.submit.requested", query });
    render();

    const work = resolver
      .resolve(query)
      .then(async (result) => {
        if (requestId !== activeLoadId) {
          return;
        }

        if (!result.ok) {
          finishFailure(query, result);
          return;
        }

        await finishSuccess(createWorldGenerationRequest(result.value, clock, state.currentSettings));
      })
      .catch((error) => {
        if (requestId !== activeLoadId) {
          return;
        }

        logger.error("session.location.resolve-failed", {
          query,
          error: error instanceof Error ? error.message : String(error)
        });
        finishFailure(query, createUnexpectedResolveFailure(query));
      });

    settlePendingWork(work);
  }

  state = transitionSessionState(state, { type: "app.boot.completed" });
  render();
  emitShellReadyTelemetry();
  scheduleBackgroundTask(() => {
    void getSceneLoader().catch(() => undefined);
  });

  return {
    getSnapshot: () => state,
    whenIdle: () => pendingWork,
    destroy: () => {
        activeLoadId += 1;
        removeAudioTelemetrySubscription();
        window.removeEventListener("pointerdown", handleAudioUnlockGesture);
        window.removeEventListener("keydown", handleShellVisibilityShortcut);
        window.removeEventListener("keydown", handleAudioUnlockGesture);
        window.removeEventListener("keydown", handleQuickRestartShortcut);
        window.removeEventListener("vite:preloadError", handlePreloadError as EventListener);
        disposeWorldScene();
        audioRuntime.dispose();
        options.host.innerHTML = "";
      }
  };
}
