import { createSceneBrowserSupportTelemetry } from "../../src/app/config/browser-support-telemetry";
import {
  createChunkWorldMassingPlan,
  resolveSceneGraphicsPresetProfile,
  resolveSceneStarterVehicleType
} from "../../src/rendering/scene/create-world-scene";
import type { BrowserSupportSnapshot } from "../../src/app/config/platform";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";

describe("create world scene", () => {
  it("keeps the sedan baseline unless a replay launch requests a different starter vehicle", () => {
    expect(resolveSceneStarterVehicleType()).toBe("sedan");
    expect(resolveSceneStarterVehicleType("sports-car")).toBe("sports-car");
    expect(resolveSceneStarterVehicleType("heavy-truck")).toBe("heavy-truck");
  });

  it("maps graphics presets to conservative explicit scene profiles", () => {
    expect(resolveSceneGraphicsPresetProfile("low")).toEqual({
      boundaryAlpha: 0.18,
      fillLightIntensity: 0.12,
      fogDensity: 0,
      graphicsPreset: "low",
      hardwareScalingLevel: 1.5,
      lightIntensity: 0.82
    });
    expect(resolveSceneGraphicsPresetProfile("medium")).toEqual({
      boundaryAlpha: 0.24,
      fillLightIntensity: 0.18,
      fogDensity: 0.0009,
      graphicsPreset: "medium",
      hardwareScalingLevel: 1.25,
      lightIntensity: 0.95
    });
    expect(resolveSceneGraphicsPresetProfile("high")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.24,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1,
      lightIntensity: 1.05
    });
  });

  it("adds explicit browser-family fallbacks without changing the selected graphics preset", () => {
    expect(resolveSceneGraphicsPresetProfile("high", "chromium")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.24,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1,
      lightIntensity: 1.05
    });
    expect(resolveSceneGraphicsPresetProfile("high", "firefox")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.23,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1.1,
      lightIntensity: 1.02
    });
    expect(resolveSceneGraphicsPresetProfile("high", "webkit")).toEqual({
      boundaryAlpha: 0.3,
      fillLightIntensity: 0.23,
      fogDensity: 0.0014,
      graphicsPreset: "high",
      hardwareScalingLevel: 1.2,
      lightIntensity: 0.99
    });
  });

  it("maps browser support snapshots into explicit scene telemetry fields", () => {
    const browserSupport: BrowserSupportSnapshot = {
      browserFamily: "webkit",
      capabilities: {
        audioContext: true,
        localStorage: false,
        mutationObserver: true,
        performanceNow: true,
        requestIdleCallback: false,
        webgl2: true
      },
      capabilityDefaults: {
        worldSize: "medium",
        graphicsPreset: "medium",
        trafficDensity: "medium",
        pedestrianDensity: "medium"
      },
      hardwareTier: "high",
      issues: ["browser-family-concessions", "storage-unavailable", "request-idle-callback-unavailable"],
      supportTier: "degraded"
    };

    expect(createSceneBrowserSupportTelemetry(browserSupport)).toEqual({
      browserAudioContextAvailable: "true",
      browserCapabilityDefaultGraphicsPreset: "medium",
      browserCapabilityDefaultPedestrianDensity: "medium",
      browserCapabilityDefaultTrafficDensity: "medium",
      browserCapabilityDefaultWorldSize: "medium",
      browserFamily: "webkit",
      browserLocalStorageAvailable: "false",
      browserMutationObserverAvailable: "true",
      browserPerformanceNowAvailable: "true",
      browserRequestIdleCallbackAvailable: "false",
      browserSupportIssues: "browser-family-concessions,storage-unavailable,request-idle-callback-unavailable",
      browserSupportTier: "degraded",
      browserWebgl2Available: "true"
    });
  });

  it("builds chunk world massing plans from manifest world entries instead of a fixed three-building fallback", () => {
    const manifest: Pick<SliceManifest, "worldEntries"> = {
      worldEntries: [
        {
          id: "world-ferry-building",
          chunkId: "chunk-0-0",
          districtId: "district-market-core",
          kind: "landmark",
          assetId: "building-2",
          position: { x: -120, y: 0, z: -40 },
          dimensions: {
            width: 48,
            height: 60,
            depth: 32
          },
          yawDegrees: 18,
          metadata: {
            displayName: "Ferry Building Proxy",
            source: "preset"
          }
        },
        {
          id: "world-market-corridor",
          chunkId: "chunk-0-0",
          districtId: "district-market-core",
          kind: "building-massing",
          assetId: "building-1",
          position: { x: 10, y: 0, z: -90 },
          dimensions: {
            width: 84,
            height: 34,
            depth: 24
          },
          metadata: {
            displayName: "Market Corridor",
            source: "preset"
          }
        },
        {
          id: "world-mission-block-a",
          chunkId: "chunk-1-1",
          districtId: "district-mission-east",
          kind: "building-massing",
          assetId: "building-0",
          position: { x: 140, y: 0, z: 170 },
          dimensions: {
            width: 36,
            height: 28,
            depth: 28
          },
          metadata: {
            displayName: "Mission Block A",
            source: "preset"
          }
        }
      ]
    };

    expect(createChunkWorldMassingPlan(manifest, "chunk-0-0")).toEqual([
      {
        id: "world-ferry-building",
        meshName: "chunk-0-0-world-entry-world-ferry-building",
        kind: "landmark",
        assetId: "building-2",
        position: { x: -120, y: 0, z: -40 },
        dimensions: {
          width: 48,
          height: 60,
          depth: 32
        },
        yawDegrees: 18,
        metadata: {
          displayName: "Ferry Building Proxy",
          source: "preset"
        }
      },
      {
        id: "world-market-corridor",
        meshName: "chunk-0-0-world-entry-world-market-corridor",
        kind: "building-massing",
        assetId: "building-1",
        position: { x: 10, y: 0, z: -90 },
        dimensions: {
          width: 84,
          height: 34,
          depth: 24
        },
        yawDegrees: 0,
        metadata: {
          displayName: "Market Corridor",
          source: "preset"
        }
      }
    ]);
    expect(createChunkWorldMassingPlan(manifest, "chunk-1-0")).toEqual([]);
  });
});
