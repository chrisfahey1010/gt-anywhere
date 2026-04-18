import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("world heat hud integration", () => {
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

  it("renders a world-ready heat HUD from the scene subscription and hides it outside play", async () => {
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
          subscribeHeat: (listener) => {
            listener({
              events: [],
              snapshot: {
                captureTimeRemainingSeconds: null,
                escapeCooldownRemainingSeconds: 0,
                escapePhase: "inactive",
                failSignal: null,
                level: 2,
                maxScore: 100,
                pursuitPhase: "none",
                recentEvents: [
                  {
                    dedupeKey: "pedestrian.struck:ped-1",
                    incidentType: "pedestrian.struck",
                    levelAfter: 2,
                    scoreAfter: 36,
                    scoreDelta: 28,
                    stageAfter: "elevated",
                    timestampSeconds: 2
                  }
                ],
                responderCount: 0,
                score: 36,
                stage: "elevated",
                stageThresholds: [0, 8, 24, 48, 72]
              }
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
      clock: () => "2026-04-10T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(hud).not.toBeNull();
    expect(hud.hidden).toBe(false);
    expect(hud.style.pointerEvents).toBe("none");
    expect(hud.textContent).toContain("HEAT");
    expect(hud.textContent).toContain("ELEVATED");
    expect(hud.textContent).toContain("PEDESTRIAN HIT");

    const sameHud = hud;

    (host.querySelector('[data-testid="edit-location"]') as HTMLButtonElement).click();

    expect(app.getSnapshot().phase).toBe("location-select");
    expect(host.querySelector('[data-testid="world-heat-hud"]')).toBe(sameHud);
    expect((host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement).hidden).toBe(true);
  });

  it("re-subscribes the heat HUD to the restarted scene so calm state replaces prior escalation", async () => {
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
                captureTimeRemainingSeconds: null,
                escapeCooldownRemainingSeconds: 0,
                escapePhase: "inactive" as const,
                failSignal: null,
                level: 3 as const,
                maxScore: 100,
                pursuitPhase: "none" as const,
                recentEvents: [
                  {
                    dedupeKey: "prop.broken:prop-1",
                    incidentType: "prop.broken" as const,
                    levelAfter: 3 as const,
                    scoreAfter: 50,
                    scoreDelta: 14,
                    stageAfter: "high" as const,
                    timestampSeconds: 3
                  }
                ],
                responderCount: 0,
                score: 50,
                stage: "high" as const,
                stageThresholds: [0, 8, 24, 48, 72] as const
              }
            : {
                captureTimeRemainingSeconds: null,
                escapeCooldownRemainingSeconds: 0,
                escapePhase: "inactive" as const,
                failSignal: null,
                level: 0 as const,
                maxScore: 100,
                pursuitPhase: "none" as const,
                recentEvents: [],
                responderCount: 0,
                score: 0,
                stage: "calm" as const,
                stageThresholds: [0, 8, 24, 48, 72] as const
              };

        return {
          canvas: document.createElement("canvas"),
          subscribeHeat: (listener) => {
            listener({ events: [], snapshot });
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
      clock: () => "2026-04-10T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;

    expect(hud.textContent).toContain("HIGH");
    expect(hud.textContent).toContain("PROP DAMAGE");

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(hud.hidden).toBe(false);
    expect(hud.textContent).toContain("CALM");
    expect(hud.textContent).toContain("KEEP IT COOL");
  });

  it("updates the HUD when a typed run outcome arrives from the scene subscription", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };
    let runOutcomeListener:
      | ((options: {
          events: Array<{ outcome: "BUSTED"; snapshot: { outcome: "BUSTED"; outcomeTimeRemainingSeconds: number; phase: "showing-outcome"; recoveryTimeRemainingSeconds: null }; timestampSeconds: number; type: "run.outcome.changed" }>;
          snapshot: {
            outcome: "BUSTED";
            outcomeTimeRemainingSeconds: number;
            phase: "showing-outcome";
            recoveryTimeRemainingSeconds: null;
          };
        }) => void)
      | undefined;
    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost }) => {
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Fake world scene</div>';

        return {
          canvas: document.createElement("canvas"),
          subscribeHeat: (listener) => {
            listener({
              events: [],
              snapshot: {
                captureTimeRemainingSeconds: null,
                escapeCooldownRemainingSeconds: 0,
                escapePhase: "inactive",
                failSignal: null,
                level: 2,
                maxScore: 100,
                pursuitPhase: "active",
                recentEvents: [],
                responderCount: 2,
                score: 36,
                stage: "elevated",
                stageThresholds: [0, 8, 24, 48, 72]
              }
            });
            return () => {};
          },
          subscribeRunOutcome: (listener) => {
            runOutcomeListener = listener as typeof runOutcomeListener;
            listener({
              events: [],
              snapshot: {
                outcome: null,
                outcomeTimeRemainingSeconds: null,
                phase: "none",
                recoveryTimeRemainingSeconds: null
              }
            });
            return () => {
              runOutcomeListener = undefined;
            };
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
      clock: () => "2026-04-10T00:00:00.000Z"
    });

    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    const hud = host.querySelector('[data-testid="world-heat-hud"]') as HTMLElement;

    if (!runOutcomeListener) {
      throw new Error("Expected run outcome listener to exist");
    }

    runOutcomeListener({
      events: [
        {
          outcome: "BUSTED",
          snapshot: {
            outcome: "BUSTED",
            outcomeTimeRemainingSeconds: 1.5,
            phase: "showing-outcome",
            recoveryTimeRemainingSeconds: null
          },
          timestampSeconds: 2,
          type: "run.outcome.changed"
        }
      ],
      snapshot: {
        outcome: "BUSTED",
        outcomeTimeRemainingSeconds: 1.5,
        phase: "showing-outcome",
        recoveryTimeRemainingSeconds: null
      }
    });

    expect(hud.textContent).toContain("PURSUIT ACTIVE");
    expect(hud.textContent).toContain("2 RESPONDERS");
    expect(hud.textContent).toContain("BUSTED");
  });
});
