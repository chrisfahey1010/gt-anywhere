import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import { InMemorySliceManifestStore } from "../../src/world/generation/slice-manifest-store";
import {
  DefaultWorldSliceGenerator,
  type GeoDataPreset,
  type GeoDataPresetSource
} from "../../src/world/generation/world-slice-generator";
import {
  validAddressLikeLocationQuery,
  validLocationAliasQuery,
  validSingleTokenLocationQuery,
  validStructuredLocationQuery
} from "../fixtures/location-queries";

describe("world slice loading integration", () => {
  function createPresetSource(): GeoDataPresetSource {
    const presets = new Map<string, GeoDataPreset>([
      [
        "san-francisco-ca",
        {
          presetId: "preset-san-francisco",
          displayName: "San Francisco, CA",
          districtName: "Downtown",
          bounds: {
            minX: -420,
            maxX: 420,
            minZ: -360,
            maxZ: 360
          },
          districts: [
            {
              id: "district-market-core",
              displayName: "Market Core",
              bounds: {
                minX: -280,
                maxX: 60,
                minZ: -260,
                maxZ: 60
              },
              anchorRoadIds: ["market-st", "van-ness-ave"]
            }
          ],
          roads: [
            {
              id: "market-st",
              kind: "primary",
              width: 18,
              points: [
                { x: -280, y: 0, z: -200 },
                { x: 280, y: 0, z: 200 }
              ]
            },
            {
              id: "van-ness-ave",
              kind: "secondary",
              width: 14,
              points: [
                { x: -60, y: 0, z: -260 },
                { x: 60, y: 0, z: 260 }
              ]
            }
          ],
          worldEntries: [
            {
              id: "world-ferry-building",
              districtId: "district-market-core",
              kind: "landmark",
              assetId: "building-2",
              position: { x: -120, y: 0, z: -40 },
              dimensions: {
                width: 48,
                height: 60,
                depth: 32
              },
              metadata: {
                displayName: "Ferry Building Proxy",
                source: "preset"
              }
            }
          ]
        }
      ],
      [
        "1600-amphitheatre-parkway-mountain-view-ca",
        {
          presetId: "preset-mountain-view-campus",
          displayName: "1600 Amphitheatre Parkway, Mountain View, CA",
          districtName: "North Bayshore",
          bounds: {
            minX: -380,
            maxX: 380,
            minZ: -320,
            maxZ: 320
          },
          districts: [
            {
              id: "district-north-bayshore-core",
              displayName: "North Bayshore Core",
              bounds: {
                minX: -220,
                maxX: 140,
                minZ: -180,
                maxZ: 160
              },
              anchorRoadIds: ["amphitheatre-parkway"]
            }
          ],
          roads: [
            {
              id: "amphitheatre-parkway",
              kind: "primary",
              width: 18,
              points: [
                { x: -320, y: 0, z: 0 },
                { x: 320, y: 0, z: 0 }
              ]
            }
          ],
          worldEntries: [
            {
              id: "mv-campus-core",
              districtId: "district-north-bayshore-core",
              kind: "landmark",
              assetId: "building-2",
              position: { x: -120, y: 0, z: -40 },
              dimensions: {
                width: 62,
                height: 34,
                depth: 40
              },
              metadata: {
                displayName: "Campus Core",
                source: "preset"
              }
            }
          ]
        }
      ]
    ]);

    return {
      async fetch(reuseKey) {
        return presets.get(reuseKey) ?? null;
      }
    };
  }

  function createSceneLoader(): WorldSceneLoader {
    return {
      load: async ({ renderHost, manifest }) => {
        renderHost.innerHTML = `<div data-testid="world-ready-scene">${manifest.sliceId}</div>`;

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          }
        };
      }
    };
  }

  it.each([
    validLocationAliasQuery,
    validStructuredLocationQuery,
    validAddressLikeLocationQuery,
    validSingleTokenLocationQuery
  ])("loads a deterministic slice and reaches world-ready for '%s'", async (query) => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const manifestStore = new InMemorySliceManifestStore();
    const sliceGenerator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore
    });
    const app = await createGameApp({
      host,
      sliceGenerator,
      sceneLoader: createSceneLoader(),
      clock: () => "2026-04-07T00:00:00.000Z"
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = query;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const snapshot = app.getSnapshot();

    expect(snapshot.phase).toBe("world-ready");
    expect(snapshot.sessionIdentity?.placeName).toBeTruthy();
    expect(snapshot.sliceManifest?.sliceId).toBeTruthy();
    expect(snapshot.sliceManifest?.districts.length ?? 0).toBeGreaterThan(0);
    expect(snapshot.sliceManifest?.worldEntries.length ?? 0).toBeGreaterThan(0);
    expect(snapshot.sliceManifest?.traffic?.vehicles.length ?? 0).toBeGreaterThan(0);
    expect(snapshot.spawnCandidate?.id).toMatch(/^spawn-/);
    expect(manifestStore.getBySliceId(snapshot.sliceManifest?.sliceId ?? "")).toEqual(snapshot.sliceManifest);
    expect(host.querySelector('[data-testid="world-ready-scene"]')?.textContent).toContain(
      snapshot.sliceManifest?.sliceId ?? ""
    );
  });
});
