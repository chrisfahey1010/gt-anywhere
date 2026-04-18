import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("quick restart integration", () => {
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-3-6",
    generationVersion: "story-3-6",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-3-6",
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

  it("routes plain Backspace through the cached restart path and prevents the browser default", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sceneLoadRecords: Array<{ manifest: SliceManifest; spawnCandidate: SpawnCandidate }> = [];
    let generateCalls = 0;
    let sceneCanvas: HTMLCanvasElement | null = null;
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
      load: async ({ renderHost, manifest, spawnCandidate }) => {
        sceneLoadRecords.push({ manifest, spawnCandidate });
        sceneCanvas = document.createElement("canvas");
        renderHost.replaceChildren(sceneCanvas);

        return {
          canvas: sceneCanvas,
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({ host, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const restartEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Backspace"
    });

    const activeSceneCanvas = host.querySelector("canvas") as HTMLCanvasElement | null;

    if (activeSceneCanvas === null) {
      throw new Error("Expected scene canvas to exist");
    }

    activeSceneCanvas.dispatchEvent(restartEvent);
    await app.whenIdle();

    expect(restartEvent.defaultPrevented).toBe(true);
    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(generateCalls).toBe(1);
    expect(sceneLoadRecords).toHaveLength(2);
    expect(sceneLoadRecords[1]).toMatchObject({
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
  });

  it("ignores Backspace quick restart inside editable focus and for modifier or repeat input", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let loadCount = 0;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        loadCount += 1;
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
    const app = await createGameApp({ host, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const editableEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Backspace"
    });
    input.dispatchEvent(editableEvent);

    const modifiedEvent = new KeyboardEvent("keydown", {
      altKey: true,
      bubbles: true,
      cancelable: true,
      code: "Backspace"
    });
    window.dispatchEvent(modifiedEvent);

    const repeatedEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Backspace",
      repeat: true
    });
    window.dispatchEvent(repeatedEvent);
    await app.whenIdle();

    expect(editableEvent.defaultPrevented).toBe(false);
    expect(modifiedEvent.defaultPrevented).toBe(false);
    expect(repeatedEvent.defaultPrevented).toBe(false);
    expect(loadCount).toBe(1);
    expect(app.getSnapshot().phase).toBe("world-ready");
  });
});
