import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import { GameEventBus } from "../../src/app/events/game-events";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
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

  it("boots to the location shell and reaches a slice-ready state on a valid submission", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const eventBus = new GameEventBus();
    let readyMilestone: string | null = null;
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
    });

    const app = await createGameApp({ host, eventBus, sliceGenerator, sceneLoader });

    expect(host.textContent).toContain("Enter a real-world location");

    const input = host.querySelector("input") as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

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
  });
});
