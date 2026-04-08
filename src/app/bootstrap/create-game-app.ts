import { GameEventBus } from "../events/game-events";
import type { ReplaySelection } from "../config/replay-options";
import { createLogger, type Logger } from "../logging/logger";
import {
  createInitialSessionState,
  transitionSessionState,
  type SessionState
} from "../state/session-state-machine";
import { LocationEntryScreen } from "../../ui/shell/location-entry-screen";
import { WorldNavigationHud } from "../../ui/hud/world-navigation-hud";
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

export interface CreateGameAppOptions {
  host: HTMLElement;
  logger?: Logger;
  resolver?: LocationResolver;
  eventBus?: GameEventBus;
  sliceGenerator?: WorldSliceGenerator;
  sceneLoader?: WorldSceneLoader;
  clock?: () => string;
  now?: () => number;
}

export interface GameApp {
  getSnapshot(): SessionState;
  whenIdle(): Promise<void>;
  destroy(): void;
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

function createSceneLoadFailure(request: WorldGenerationRequest, error: unknown): WorldLoadFailure {
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

interface CachedWorldLoadData {
  manifest: SliceManifest;
  spawnCandidate: SpawnCandidate;
}

export async function createGameApp(options: CreateGameAppOptions): Promise<GameApp> {
  const logger = options.logger ?? createLogger();
  const resolver = options.resolver ?? new LocationResolver();
  const eventBus = options.eventBus ?? new GameEventBus();
  const sliceGenerator = options.sliceGenerator ?? new DefaultWorldSliceGenerator();
  const clock = options.clock ?? (() => new Date().toISOString());
  const now = options.now ?? (() => Date.now());
  const { hudHost, renderHost, shellHost } = createAppHosts(options.host);
  const screen = new LocationEntryScreen({
    host: shellHost,
    onSubmit: handleSubmit,
    onEdit: handleEdit,
    onReplay: handleReplay,
    onRestart: handleRestart,
    onRetry: handleRetry
  });
  const navigationHud = new WorldNavigationHud({ host: hudHost });

  let state = createInitialSessionState();
  let pendingWork = Promise.resolve();
  let activeLoadId = 0;
  let worldScene: WorldSceneHandle | null = null;
  let sceneLoader = options.sceneLoader ?? null;
  let sceneLoaderPromise: Promise<WorldSceneLoader> | null = null;
  let removeNavigationSubscription = (): void => {};

  const render = (): void => {
    screen.render(state);
    renderHost.dataset.phase = state.phase;
    navigationHud.setVisible(state.phase === "world-ready");
  };

  const settlePendingWork = (work: Promise<unknown>): void => {
    pendingWork = work.then(
      () => undefined,
      () => undefined
    );
  };

  const disposeWorldScene = (): void => {
    removeNavigationSubscription();
    removeNavigationSubscription = (): void => {};
    navigationHud.clear();
    worldScene?.dispose();
    worldScene = null;
    renderHost.innerHTML = "";
  };

  const getSceneLoader = async (): Promise<WorldSceneLoader> => {
    if (sceneLoader) {
      return sceneLoader;
    }

    sceneLoaderPromise ??= createDefaultWorldSceneLoader().then((loader) => {
      sceneLoader = loader;

      return loader;
    });

    return sceneLoaderPromise;
  };

  const emitLoadFailure = (request: WorldGenerationRequest, failure: WorldLoadFailure, startedAtMs: number): void => {
    const durationMs = now() - startedAtMs;

    eventBus.emit({
      type: "world.load.failed",
      request,
      failure,
      durationMs
    });
    logger.error("world.load.failed", {
      code: failure.code,
      stage: failure.stage,
      placeName: failure.placeName,
      durationMs,
      ...failure.details
    });

    disposeWorldScene();
    state = transitionSessionState(state, {
      type: "world.load.failed",
      failure
    });
    render();
  };

  const beginLoadAttempt = (): { startedAtMs: number; loadId: number } => ({
    startedAtMs: now(),
    loadId: ++activeLoadId
  });

  const emitManifestReady = (
    request: WorldGenerationRequest,
    manifest: SliceManifest,
    spawnCandidate: SpawnCandidate,
    startedAtMs: number
  ): void => {
    const manifestDurationMs = now() - startedAtMs;

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
        renderHost,
        manifest,
        replaySelection,
        spawnCandidate,
        starterVehicleType: replaySelection?.starterVehicleType
      });

      removeNavigationSubscription =
        worldScene.subscribeNavigation?.((snapshot) => {
          navigationHud.render(snapshot);
        }) ?? (() => {});
      const initialNavigationSnapshot = worldScene.getNavigationSnapshot?.();

      if (initialNavigationSnapshot !== undefined) {
        navigationHud.render(initialNavigationSnapshot);
      }

      if (loadId !== activeLoadId) {
        disposeWorldScene();
        return;
      }

      const readyDurationMs = now() - startedAtMs;

      eventBus.emit({
        type: "world.scene.ready",
        request,
        manifest,
        durationMs: readyDurationMs,
        readinessMilestone: "controllable-vehicle"
      });
      logger.info("world.scene.ready", {
        placeName: request.location.placeName,
        sliceId: manifest.sliceId,
        durationMs: readyDurationMs,
        readinessMilestone: "controllable-vehicle"
      });

      state = transitionSessionState(state, { type: "world.scene.ready" });
      render();
    } catch (error) {
      if (loadId !== activeLoadId) {
        return;
      }

      emitLoadFailure(request, createSceneLoadFailure(request, error), startedAtMs);
    }
  };

  const resolveCachedWorldLoadData = (): CachedWorldLoadData | null => {
    const manifest =
      state.sliceManifest ??
      (state.sessionIdentity === null ? null : sliceGenerator.getStoredManifestByReuseKey?.(state.sessionIdentity.reuseKey) ?? null);
    const spawnCandidate = state.spawnCandidate ?? manifest?.spawnCandidates[0] ?? null;

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

  function handleEdit(): void {
    activeLoadId += 1;
    disposeWorldScene();
    state = transitionSessionState(state, { type: "location.edit.requested" });
    render();
  }

  function handleRetry(): void {
    if (state.phase !== "world-load-error" || state.handoff === null) {
      return;
    }

    const request = state.handoff;
    const cachedWorldLoadData = resolveCachedWorldLoadData();

    state = transitionSessionState(state, { type: "world.retry.requested" });
    render();

    settlePendingWork(
      cachedWorldLoadData === null
        ? runGeneratedWorldLoad(request, state.replaySelection)
        : runCachedWorldLoad(request, cachedWorldLoadData, state.replaySelection)
    );
  }

  function handleRestart(): void {
    if (state.phase !== "world-ready" || state.handoff === null) {
      return;
    }

    const request = state.handoff;
    const cachedWorldLoadData = resolveCachedWorldLoadData();

    if (cachedWorldLoadData === null) {
      return;
    }

    state = transitionSessionState(state, { type: "world.restart.requested" });
    render();

    settlePendingWork(runCachedWorldLoad(request, cachedWorldLoadData, null));
  }

  function handleReplay(selection: ReplaySelection): void {
    if (state.phase !== "world-ready" || state.handoff === null) {
      return;
    }

    const request = state.handoff;
    const cachedWorldLoadData = resolveCachedWorldLoadData();

    if (cachedWorldLoadData === null) {
      return;
    }

    state = transitionSessionState(state, { type: "world.replay.requested", selection });
    render();

    settlePendingWork(runCachedWorldLoad(request, cachedWorldLoadData, selection));
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

        await finishSuccess(createWorldGenerationRequest(result.value, clock));
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

    return {
      getSnapshot: () => state,
      whenIdle: () => pendingWork,
      destroy: () => {
        activeLoadId += 1;
        disposeWorldScene();
        options.host.innerHTML = "";
      }
    };
}
