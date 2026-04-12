import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { PlayerSettings } from "../../src/app/config/settings-schema";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import type { PlayerSettingsRepository } from "../../src/persistence/settings/local-storage-player-settings-repository";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("player settings integration", () => {
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

  function createWorldDependencies(): {
    sceneLoader: WorldSceneLoader;
    sliceGenerator: WorldSliceGenerator;
  } {
    return {
      sliceGenerator: {
        generate: async () => ({
          ok: true,
          manifest,
          spawnCandidate: manifest.spawnCandidates[0]
        })
      },
      sceneLoader: {
        load: async ({ renderHost }) => {
          renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

          return {
            canvas: document.createElement("canvas"),
            dispose: () => {
              renderHost.innerHTML = "";
            }
          };
        }
      }
    };
  }

  it("hydrates launch essentials from saved settings and keeps deeper tuning behind the settings surface", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const savedSettings: PlayerSettings = {
      worldSize: "large",
      graphicsPreset: "high",
      trafficDensity: "medium",
      pedestrianDensity: "off"
    };
    const repository: PlayerSettingsRepository = {
      load: () => savedSettings,
      save: () => true
    };
    const { sliceGenerator, sceneLoader } = createWorldDependencies();
    await createGameApp({
      host,
      settingsRepository: repository,
      sliceGenerator,
      sceneLoader
    });

    const largeWorldSize = host.querySelector('[data-testid="world-size-large"]') as HTMLButtonElement;
    const openSettings = host.querySelector('[data-testid="open-settings"]') as HTMLButtonElement;

    expect(largeWorldSize.getAttribute("aria-pressed")).toBe("true");
    expect(openSettings).not.toBeNull();

    openSettings.click();

    expect(host.querySelector('[data-testid="settings-surface"]')).not.toBeNull();
    expect((host.querySelector('[data-testid="settings-world-size"]') as HTMLSelectElement).value).toBe("large");
    expect((host.querySelector('[data-testid="settings-graphics-preset"]') as HTMLSelectElement).value).toBe("high");
    expect((host.querySelector('[data-testid="settings-traffic-density"]') as HTMLSelectElement).value).toBe("medium");
    expect((host.querySelector('[data-testid="settings-pedestrian-density"]') as HTMLSelectElement).value).toBe("off");
  });

  it("applies and saves settings from the world-ready overlay without breaking restart controls", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let persistedSettings: PlayerSettings | null = null;
    const repository: PlayerSettingsRepository = {
      load: () => null,
      save: (settings) => {
        persistedSettings = settings;
        return true;
      }
    };
    const { sliceGenerator, sceneLoader } = createWorldDependencies();
    const app = await createGameApp({
      host,
      settingsRepository: repository,
      sliceGenerator,
      sceneLoader
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    (host.querySelector('[data-testid="open-settings"]') as HTMLButtonElement).click();

    const graphicsPreset = host.querySelector('[data-testid="settings-graphics-preset"]') as HTMLSelectElement;
    const trafficDensity = host.querySelector('[data-testid="settings-traffic-density"]') as HTMLSelectElement;
    const pedestrianDensity = host.querySelector('[data-testid="settings-pedestrian-density"]') as HTMLSelectElement;

    graphicsPreset.value = "high";
    graphicsPreset.dispatchEvent(new Event("change", { bubbles: true }));
    trafficDensity.value = "low";
    trafficDensity.dispatchEvent(new Event("change", { bubbles: true }));
    pedestrianDensity.value = "off";
    pedestrianDensity.dispatchEvent(new Event("change", { bubbles: true }));

    expect(host.textContent).toContain("next recreated run");

    (host.querySelector('[data-testid="apply-settings"]') as HTMLButtonElement).click();

    expect(persistedSettings).toEqual({
      worldSize: "medium",
      graphicsPreset: "high",
      trafficDensity: "low",
      pedestrianDensity: "off"
    });

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
  });

  it("regenerates the next run when world size changes instead of reusing the old compatible slice", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let generateCalls = 0;
    const manifestsById = new Map<string, SliceManifest>();
    const sceneLoadSliceIds: string[] = [];
    const repository: PlayerSettingsRepository = {
      load: () => null,
      save: () => true
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async (request) => {
        generateCalls += 1;

        const nextManifest: SliceManifest = {
          ...manifest,
          sliceId: request.compatibilityKey,
          bounds:
            request.generationSettings.worldSize === "large"
              ? {
                  minX: -520,
                  maxX: 520,
                  minZ: -520,
                  maxZ: 520
                }
              : manifest.bounds
        };

        manifestsById.set(nextManifest.sliceId, nextManifest);

        return {
          ok: true,
          manifest: nextManifest,
          spawnCandidate: nextManifest.spawnCandidates[0]
        };
      },
      getStoredManifest: (sliceId) => manifestsById.get(sliceId) ?? null
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ manifest, renderHost }) => {
        sceneLoadSliceIds.push(manifest.sliceId);
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({
      host,
      settingsRepository: repository,
      sliceGenerator,
      sceneLoader
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    (host.querySelector('[data-testid="world-size-large"]') as HTMLButtonElement).click();
    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(generateCalls).toBe(2);
    expect(sceneLoadSliceIds).toHaveLength(2);
    expect(sceneLoadSliceIds[0]).not.toBe(sceneLoadSliceIds[1]);
  });

  it("reuses the current compatible slice when only the graphics preset changes", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let generateCalls = 0;
    const manifestsById = new Map<string, SliceManifest>();
    const sceneLoadRecords: Array<{ graphicsPreset: string; sliceId: string }> = [];
    const repository: PlayerSettingsRepository = {
      load: () => null,
      save: () => true
    };
    const sliceGenerator: WorldSliceGenerator = {
      generate: async (request) => {
        generateCalls += 1;

        const nextManifest: SliceManifest = {
          ...manifest,
          sliceId: request.compatibilityKey
        };

        manifestsById.set(nextManifest.sliceId, nextManifest);

        return {
          ok: true,
          manifest: nextManifest,
          spawnCandidate: nextManifest.spawnCandidates[0]
        };
      },
      getStoredManifest: (sliceId) => manifestsById.get(sliceId) ?? null
    };
    const sceneLoader: WorldSceneLoader = {
      load: async ({ manifest, renderHost, settings }) => {
        sceneLoadRecords.push({
          graphicsPreset: settings.graphicsPreset,
          sliceId: manifest.sliceId
        });
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
    const app = await createGameApp({
      host,
      settingsRepository: repository,
      sliceGenerator,
      sceneLoader
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    (host.querySelector('[data-testid="open-settings"]') as HTMLButtonElement).click();

    const graphicsPreset = host.querySelector('[data-testid="settings-graphics-preset"]') as HTMLSelectElement;

    graphicsPreset.value = "low";
    graphicsPreset.dispatchEvent(new Event("change", { bubbles: true }));

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(generateCalls).toBe(1);
    expect(sceneLoadRecords).toHaveLength(2);
    expect(sceneLoadRecords[0]?.sliceId).toBe(sceneLoadRecords[1]?.sliceId);
    expect(sceneLoadRecords[0]?.graphicsPreset).not.toBe(sceneLoadRecords[1]?.graphicsPreset);
  });
});
