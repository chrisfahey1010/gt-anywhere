import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import { GameEventBus } from "../../src/app/events/game-events";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { WorldNavigationSnapshot } from "../../src/rendering/scene/world-scene-runtime";
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
        displayName: "Market Street",
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
    expect(readyCount).toBe(1);

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(host.textContent).toContain("Slice ready");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).not.toBeNull();
    expect(readyMilestone).toBe("controllable-vehicle");
    expect(readyCount).toBe(2);
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
