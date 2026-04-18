import { afterEach, describe, expect, it, vi } from "vitest";
import { GameEventBus } from "../../src/app/events/game-events";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("world heat failure integration", () => {
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-3-5",
    generationVersion: "story-3-5",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-3-5",
    bounds: {
      minX: -400,
      maxX: 400,
      minZ: -320,
      maxZ: 320
    },
    chunks: [
      {
        id: "chunk-0-0",
        origin: { x: -400, y: 0, z: -320 },
        size: { width: 800, depth: 640 },
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
          { x: -280, y: 0, z: -120 },
          { x: 280, y: 0, z: 120 }
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

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../src/ui/hud/world-heat-hud");
  });

  it("routes heat HUD initialization failures through the existing world-load failure path", async () => {
    vi.resetModules();
    vi.doMock("../../src/ui/hud/world-heat-hud", () => ({
      WorldHeatHud: class {
        constructor() {
          throw new Error("heat hud init failed");
        }
      }
    }));

    const { createGameApp } = await import("../../src/app/bootstrap/create-game-app");

    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let failureCode: string | null = null;
    let failureStage: string | null = null;
    let failureError: unknown = null;
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
          subscribeHeat: () => () => {},
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };

    eventBus.on("world.load.failed", (event) => {
      failureCode = event.failure.code;
      failureStage = event.failure.stage;
      failureError = event.failure.details.error;
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(failureCode).toBe("WORLD_SCENE_LOAD_FAILED");
    expect(failureStage).toBe("world-loading");
    expect(failureError).toBe("heat hud init failed");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).toBeNull();
  });

  it("preserves a typed world-loading failure when heat runtime initialization fails", async () => {
    const { createGameApp } = await import("../../src/app/bootstrap/create-game-app");
    const { createWorldSceneRuntimeError } = await import("../../src/world/generation/world-load-failure");

    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let failureCode: string | null = null;
    let failureStage: string | null = null;
    let failureSpawnCandidateId: unknown = null;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async () => {
        throw createWorldSceneRuntimeError(
          "WORLD_SCENE_LOAD_FAILED",
          "world-loading",
          "The world heat runtime could not be initialized.",
          { spawnCandidateId: "spawn-0" }
        );
      }
    };

    eventBus.on("world.load.failed", (event) => {
      failureCode = event.failure.code;
      failureStage = event.failure.stage;
      failureSpawnCandidateId = event.failure.details.spawnCandidateId;
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(failureCode).toBe("WORLD_SCENE_LOAD_FAILED");
    expect(failureStage).toBe("world-loading");
    expect(failureSpawnCandidateId).toBe("spawn-0");
  });
});
