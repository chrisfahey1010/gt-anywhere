import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldAudioRuntime, WorldAudioTelemetry } from "../../src/audio/world-audio-runtime";
import type { HeatRuntimeSnapshot } from "../../src/sandbox/heat/heat-runtime";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

function createHeatSnapshot(overrides: Partial<HeatRuntimeSnapshot> = {}): HeatRuntimeSnapshot {
  return {
    captureTimeRemainingSeconds: null,
    escapeCooldownRemainingSeconds: 0,
    escapePhase: "inactive",
    failSignal: null,
    level: 0,
    maxScore: 100,
    pursuitPhase: "none",
    recentEvents: [],
    responderCount: 0,
    score: 0,
    stage: "calm",
    stageThresholds: [0, 8, 24, 48, 72],
    ...overrides
  };
}

describe("polish telemetry integration", () => {
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-4-4",
    generationVersion: "story-4-4",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-4-4",
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

  it("keeps additive visual and audio telemetry visible across restart without breaking readiness", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const listeners = new Set<(telemetry: WorldAudioTelemetry) => void>();
    let telemetry: WorldAudioTelemetry = {
      ambienceEnabled: true,
      available: true,
      cueCount: 0,
      lastCue: "none",
      mood: "inactive",
      profile: "medium",
      unlockState: "uninitialized",
      vehiclePresence: "none"
    };
    const updateTelemetry = (changes: Partial<WorldAudioTelemetry>): void => {
      telemetry = {
        ...telemetry,
        ...changes
      };
      listeners.forEach((listener) => {
        listener(telemetry);
      });
    };
    const audioRuntime: WorldAudioRuntime = {
      dispose: () => {},
      getTelemetry: () => telemetry,
      handleChaosEventTypes: () => {},
      handleCombatEvents: () => {},
      handleHeat: ({ snapshot }) => {
        updateTelemetry({ mood: snapshot.stage });
      },
      onTelemetryChanged: (listener) => {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
      resetWorld: () => {
        updateTelemetry({
          cueCount: 0,
          lastCue: "none",
          mood: "inactive",
          vehiclePresence: "none"
        });
      },
      setPolishProfile: (profile) => {
        updateTelemetry({
          ambienceEnabled: profile.ambienceEnabled,
          profile: profile.profile
        });
      },
      setWorldState: (state) => {
        updateTelemetry({
          vehiclePresence:
            state.worldReady && state.possessionMode === "vehicle" ? (state.activeVehicleType ?? "vehicle") : "none"
        });
      },
      unlock: async () => {
        updateTelemetry({ unlockState: "unlocked" });
      }
    };
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

        canvas.dataset.activeVehicleType = "sedan";
        canvas.dataset.graphicsFogDensity = "0.0014";
        canvas.dataset.possessionMode = "vehicle";
        canvas.dataset.readyMilestone = "controllable-vehicle";
        canvas.dataset.visualPaletteSkyColor = "#9fd4ff";
        renderHost.replaceChildren(canvas);

        return {
          canvas,
          subscribeHeat: (listener) => {
            listener({ events: [], snapshot: createHeatSnapshot() });
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
      audioRuntime,
      capabilityDefaults: {
        worldSize: "medium",
        graphicsPreset: "medium",
        trafficDensity: "medium",
        pedestrianDensity: "medium"
      },
      sceneLoader,
      sliceGenerator
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await app.whenIdle();

    const canvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(canvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(canvas.dataset.graphicsFogDensity).toBe("0.0014");
    expect(canvas.dataset.visualPaletteSkyColor).toBe("#9fd4ff");
    expect(canvas.dataset.audioProfile).toBe("medium");
    expect(canvas.dataset.audioAmbienceEnabled).toBe("true");
    expect(canvas.dataset.audioVehiclePresence).toBe("sedan");

    (host.querySelector('[data-testid="restart-from-spawn"]') as HTMLButtonElement).click();
    await app.whenIdle();

    const restartedCanvas = host.querySelector("canvas") as HTMLCanvasElement;

    expect(restartedCanvas.dataset.readyMilestone).toBe("controllable-vehicle");
    expect(restartedCanvas.dataset.graphicsFogDensity).toBe("0.0014");
    expect(restartedCanvas.dataset.visualPaletteSkyColor).toBe("#9fd4ff");
    expect(restartedCanvas.dataset.audioProfile).toBe("medium");
    expect(restartedCanvas.dataset.audioVehiclePresence).toBe("sedan");
  });
});
