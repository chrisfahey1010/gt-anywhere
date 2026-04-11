import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneHandle, WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { RunOutcomeEvent, RunOutcomeSnapshot } from "../../src/sandbox/reset/run-outcome-runtime";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("run outcome restart integration", () => {
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

  function createIdleRunOutcomeSnapshot(overrides: Partial<RunOutcomeSnapshot> = {}): RunOutcomeSnapshot {
    return {
      outcome: null,
      outcomeTimeRemainingSeconds: null,
      phase: "none",
      recoveryTimeRemainingSeconds: null,
      ...overrides
    };
  }

  function emitAutoRestart(listener: (options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void): void {
    listener({
      events: [
        {
          outcome: "BUSTED",
          snapshot: createIdleRunOutcomeSnapshot({
            outcome: "BUSTED",
            outcomeTimeRemainingSeconds: 0,
            phase: "restart-pending"
          }),
          timestampSeconds: 2,
          type: "run.outcome.restart.requested"
        }
      ],
      snapshot: createIdleRunOutcomeSnapshot({
        outcome: "BUSTED",
        outcomeTimeRemainingSeconds: 0,
        phase: "restart-pending"
      })
    });
  }

  it("reuses the cached same-slice restart path when the scene requests auto recovery after a run outcome", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sceneLoadRecords: Array<{ manifest: SliceManifest; spawnCandidate: SpawnCandidate }> = [];
    let generateCalls = 0;
    let runOutcomeListener: ((options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void) | undefined;
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
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        const handle: WorldSceneHandle = {
          canvas: document.createElement("canvas"),
          dispose: () => {
            renderHost.innerHTML = "";
          },
          subscribeRunOutcome: (listener) => {
            runOutcomeListener = listener;
            listener({ events: [], snapshot: createIdleRunOutcomeSnapshot() });
            return () => {
              if (runOutcomeListener === listener) {
                runOutcomeListener = undefined;
              }
            };
          }
        };

        return handle;
      }
    };
    const app = await createGameApp({ host, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    if (runOutcomeListener === undefined) {
      throw new Error("Expected run outcome listener to be registered");
    }

    const notifyRunOutcome = runOutcomeListener;

    emitAutoRestart(notifyRunOutcome);

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(generateCalls).toBe(1);
    expect(sceneLoadRecords).toHaveLength(2);
    expect(sceneLoadRecords[0]).toMatchObject({
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
    expect(sceneLoadRecords[1]).toMatchObject({
      manifest,
      spawnCandidate: manifest.spawnCandidates[0]
    });
  });

  it("preserves retry and edit flows when automatic fail recovery cannot reload the cached scene", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let runOutcomeListener: ((options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void) | undefined;
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

        if (loadCount === 2) {
          throw new Error("auto restart scene load failed");
        }

        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          subscribeRunOutcome: (listener) => {
            runOutcomeListener = listener;
            listener({ events: [], snapshot: createIdleRunOutcomeSnapshot() });
            return () => {
              if (runOutcomeListener === listener) {
                runOutcomeListener = undefined;
              }
            };
          },
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

    if (!runOutcomeListener) {
      throw new Error("Expected run outcome listener to be registered");
    }

    emitAutoRestart(runOutcomeListener);
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-load-error");
    expect(app.getSnapshot().sessionIdentity?.placeName).toBe("San Francisco, CA");
    expect(app.getSnapshot().sliceManifest?.sliceId).toBe(manifest.sliceId);
    expect(app.getSnapshot().spawnCandidate?.id).toBe("spawn-0");
    expect(host.textContent).toContain("Retry load");
    expect(host.textContent).toContain("Edit location");
  });

  it("ignores a late automatic restart completion after the player edits away from world-ready", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    let runOutcomeListener: ((options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void) | undefined;
    let resolveRestartSceneLoad:
      | ((value: { canvas: HTMLCanvasElement; dispose(): void; subscribeRunOutcome?(listener: (options: { events: RunOutcomeEvent[]; snapshot: RunOutcomeSnapshot }) => void): () => void }) => void)
      | undefined;
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

        if (loadCount === 1) {
          renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

          return {
            canvas: document.createElement("canvas"),
            subscribeRunOutcome: (listener) => {
              runOutcomeListener = listener;
              listener({ events: [], snapshot: createIdleRunOutcomeSnapshot() });
              return () => {
                if (runOutcomeListener === listener) {
                  runOutcomeListener = undefined;
                }
              };
            },
            dispose: () => {
              renderHost.innerHTML = "";
            }
          };
        }

        return new Promise((resolve) => {
          resolveRestartSceneLoad = (value) => {
            renderHost.innerHTML = '<div data-testid="world-ready-scene">Restarted world scene</div>';
            resolve(value);
          };
        });
      }
    };
    const app = await createGameApp({ host, sceneLoader, sliceGenerator });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    if (!runOutcomeListener) {
      throw new Error("Expected run outcome listener to be registered");
    }

    emitAutoRestart(runOutcomeListener);
    await Promise.resolve();
    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    resolveRestartSceneLoad?.({
      canvas: document.createElement("canvas"),
      dispose: () => {
        host.querySelector('[data-testid="world-ready-scene"]')?.remove();
      }
    });

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(host.querySelector('[data-testid="world-ready-scene"]')).toBeNull();
  });
});
