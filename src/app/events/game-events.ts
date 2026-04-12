import type {
  LocationResolveFailure,
  SessionLocationIdentity,
  WorldGenerationRequest
} from "../../world/generation/location-resolver";
import type { SpawnCandidate, SliceManifest } from "../../world/chunks/slice-manifest";
import type { WorldLoadFailure } from "../../world/generation/world-load-failure";

export type GameEvent =
  | { type: "app.shell.ready"; durationMs: number; phase: "location-select" }
  | { type: "session.location.submitted"; query: string }
  | { type: "session.location.resolved"; identity: SessionLocationIdentity }
  | { type: "session.location.resolve-failed"; failure: LocationResolveFailure; query: string }
  | { type: "world.generation.requested"; request: WorldGenerationRequest }
  | { type: "world.generation.started"; request: WorldGenerationRequest }
  | {
      type: "world.manifest.ready";
      request: WorldGenerationRequest;
      manifest: SliceManifest;
      spawnCandidate: SpawnCandidate;
      durationMs: number;
    }
  | {
      type: "world.scene.ready";
      request: WorldGenerationRequest;
      manifest: SliceManifest;
      durationMs: number;
      readinessMilestone: "controllable-vehicle";
    }
  | {
      type: "world.load.failed";
      request: WorldGenerationRequest;
      failure: WorldLoadFailure;
      durationMs: number;
    };

type GameEventHandler<TType extends GameEvent["type"]> = (
  event: Extract<GameEvent, { type: TType }>
) => void;

export class GameEventBus {
  private readonly listeners = new Map<GameEvent["type"], Set<(event: GameEvent) => void>>();

  emit(event: GameEvent): void {
    this.listeners.get(event.type)?.forEach((handler) => handler(event));
  }

  on<TType extends GameEvent["type"]>(type: TType, handler: GameEventHandler<TType>): () => void {
    const handlers = this.listeners.get(type) ?? new Set<(event: GameEvent) => void>();
    handlers.add(handler as (event: GameEvent) => void);
    this.listeners.set(type, handlers);

    return () => {
      handlers.delete(handler as (event: GameEvent) => void);

      if (handlers.size === 0) {
        this.listeners.delete(type);
      }
    };
  }
}
