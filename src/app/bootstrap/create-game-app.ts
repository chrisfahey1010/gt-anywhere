import { GameEventBus } from "../events/game-events";
import { createLogger, type Logger } from "../logging/logger";
import {
  createInitialSessionState,
  transitionSessionState,
  type SessionState
} from "../state/session-state-machine";
import { LocationEntryScreen } from "../../ui/shell/location-entry-screen";
import {
  createWorldGenerationRequest,
  LocationResolver,
  type LocationResolveFailure,
  type WorldGenerationRequest
} from "../../world/generation/location-resolver";

export interface CreateGameAppOptions {
  host: HTMLElement;
  logger?: Logger;
  resolver?: LocationResolver;
  eventBus?: GameEventBus;
  clock?: () => string;
}

export interface GameApp {
  getSnapshot(): SessionState;
  whenIdle(): Promise<void>;
  destroy(): void;
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

export async function createGameApp(options: CreateGameAppOptions): Promise<GameApp> {
  const logger = options.logger ?? createLogger();
  const resolver = options.resolver ?? new LocationResolver();
  const eventBus = options.eventBus ?? new GameEventBus();
  const clock = options.clock ?? (() => new Date().toISOString());
  const screen = new LocationEntryScreen({
    host: options.host,
    onSubmit: handleSubmit,
    onEdit: handleEdit
  });

  let state = createInitialSessionState();
  let pendingWork = Promise.resolve();

  const render = (): void => {
    screen.render(state);
  };

  const settlePendingWork = (work: Promise<unknown>): void => {
    pendingWork = work.then(
      () => undefined,
      () => undefined
    );
  };

  const finishSuccess = (handoff: WorldGenerationRequest): void => {
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
    state = transitionSessionState(state, { type: "location.edit.requested" });
    render();
  }

  function handleSubmit(query: string): void {
    if (state.phase === "location-resolving") {
      return;
    }

    eventBus.emit({ type: "session.location.submitted", query });
    logger.info("session.location.submitted", { query });

    state = transitionSessionState(state, { type: "location.submit.requested", query });
    render();

    const work = resolver
      .resolve(query)
      .then((result) => {
        if (!result.ok) {
          finishFailure(query, result);
          return;
        }

        finishSuccess(createWorldGenerationRequest(result.value, clock));
      })
      .catch((error) => {
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
      options.host.innerHTML = "";
    }
  };
}
