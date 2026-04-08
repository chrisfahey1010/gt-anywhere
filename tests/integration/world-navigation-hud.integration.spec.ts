import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { WorldNavigationSnapshot } from "../../src/rendering/scene/world-scene-runtime";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("world navigation hud integration", () => {
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-2-4",
    generationVersion: "story-2-4",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-2-4",
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

  it("renders a dedicated non-interactive HUD that survives shell rerenders", async () => {
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
          subscribeNavigation: (listener) => {
            listener({
              actor: {
                position: { x: 24, y: 1.7, z: 12 },
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
                    { x: -280, z: -120 },
                    { x: 280, z: 120 }
                  ]
                }
              ],
              streetLabel: "Market Street"
            });

            return () => {};
          },
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

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(hud).not.toBeNull();
    expect(hud.style.pointerEvents).toBe("none");
    expect(hud.hidden).toBe(false);
    expect(hud.textContent).toContain("Market Street");
    expect(hud.textContent).toContain("Downtown");
    expect(hud.textContent).toContain("San Francisco, CA");
    expect(hud.querySelector('[data-testid="world-navigation-minimap"]')).not.toBeNull();
    expect(hud.querySelector('[data-testid="world-navigation-marker"]')).not.toBeNull();

    const sameHud = hud;

    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(host.querySelector('[data-testid="world-navigation-hud"]')).toBe(sameHud);
    expect((host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement).hidden).toBe(true);
  });

  it("re-subscribes the HUD to the restarted scene so labels and marker position refresh from spawn", async () => {
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

        const snapshot =
          loadCount === 1
            ? {
                actor: {
                  position: { x: 24, y: 1.7, z: 12 },
                  facingYaw: Math.PI / 2,
                  possessionMode: "vehicle" as const
                },
                bounds: manifest.bounds,
                districtName: "Downtown",
                locationName: "San Francisco, CA",
                roads: [
                  {
                    id: "market-st",
                    displayName: "Market Street",
                    kind: "primary" as const,
                    width: 18,
                    points: [
                      { x: -280, z: -120 },
                      { x: 280, z: 120 }
                    ]
                  }
                ],
                streetLabel: "Market Street"
              }
            : {
                actor: {
                  position: { x: -16, y: 1.7, z: -8 },
                  facingYaw: 0,
                  possessionMode: "vehicle" as const
                },
                bounds: manifest.bounds,
                districtName: "Downtown",
                locationName: "San Francisco, CA",
                roads: [
                  {
                    id: "mission-st",
                    displayName: "Mission Street",
                    kind: "tertiary" as const,
                    width: 12,
                    points: [
                      { x: -240, z: 40 },
                      { x: 220, z: 100 }
                    ]
                  }
                ],
                streetLabel: "Mission Street"
              };

        return {
          canvas: document.createElement("canvas"),
          subscribeNavigation: (listener) => {
            listener(snapshot);

            return () => {};
          },
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

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;
    const firstMarker = hud.querySelector('[data-testid="world-navigation-marker"]') as SVGCircleElement;
    const firstMarkerX = firstMarker.getAttribute("cx");
    const firstMarkerY = firstMarker.getAttribute("cy");

    expect(hud.textContent).toContain("Market Street");
    expect(firstMarkerX).toBeTruthy();
    expect(firstMarkerY).toBeTruthy();

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    const restartedMarker = hud.querySelector('[data-testid="world-navigation-marker"]') as SVGCircleElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(loadCount).toBe(2);
    expect(hud.textContent).toContain("Mission Street");
    expect(restartedMarker.getAttribute("cx")).not.toBe(firstMarkerX);
    expect(restartedMarker.getAttribute("cy")).not.toBe(firstMarkerY);
  });

  it("updates the HUD when the navigation subscription switches from vehicle mode to on-foot mode", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    let emitNavigationSnapshot: ((snapshot: WorldNavigationSnapshot) => void) | null = null;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          subscribeNavigation: (listener) => {
            emitNavigationSnapshot = listener;
            listener({
              actor: {
                position: { x: 24, y: 1.7, z: 12 },
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
                    { x: -280, z: -120 },
                    { x: 280, z: 120 }
                  ]
                }
              ],
              streetLabel: "Market Street"
            });

            return () => {};
          },
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

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-navigation-hud"]') as HTMLElement;
    const marker = hud.querySelector('[data-testid="world-navigation-marker"]') as SVGCircleElement;
    const vehicleMarkerX = marker.getAttribute("cx");
    const vehicleMarkerY = marker.getAttribute("cy");

    const dispatchNavigationSnapshot = emitNavigationSnapshot as ((snapshot: WorldNavigationSnapshot) => void) | null;

    if (dispatchNavigationSnapshot === null) {
      throw new Error("Expected HUD navigation subscription to be registered");
    }

    dispatchNavigationSnapshot({
      actor: {
        position: { x: -8, y: 0.9, z: -20 },
        facingYaw: Math.PI / 4,
        possessionMode: "on-foot"
      },
      bounds: manifest.bounds,
      districtName: "Downtown",
      locationName: "San Francisco, CA",
      roads: [
        {
          id: "mission-st",
          displayName: "Mission Street",
          kind: "tertiary",
          width: 12,
          points: [
            { x: -240, z: 40 },
            { x: 220, z: 100 }
          ]
        }
      ],
      streetLabel: "Mission Street"
    });

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(hud.textContent).toContain("Mission Street");
    expect(marker.getAttribute("cx")).not.toBe(vehicleMarkerX);
    expect(marker.getAttribute("cy")).not.toBe(vehicleMarkerY);
  });
});
