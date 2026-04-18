import { NullEngine, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import { beforeEach, vi } from "vitest";
import { createSceneBrowserSupportTelemetry } from "../../src/app/config/browser-support-telemetry";
const { attachAuthoredVisualToProxyMock } = vi.hoisted(() => ({
  attachAuthoredVisualToProxyMock: vi.fn()
}));

vi.mock("../../src/rendering/scene/authored-asset-visual", () => ({
  attachAuthoredVisualToProxy: attachAuthoredVisualToProxyMock
}));

import {
  buildChunkMassing,
  buildRoadSegments,
  createChunkWorldMassingPlan,
  resolveResidentChunkIds,
  resolveSceneGraphicsPresetProfile,
  resolveSceneStarterVehicleType
} from "../../src/rendering/scene/create-world-scene";
import type { BrowserSupportSnapshot } from "../../src/app/config/platform";
import type { AssetRegistry } from "../../src/rendering/scene/asset-registry";
import type { SliceManifest } from "../../src/world/chunks/slice-manifest";

describe("create world scene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("keeps the current chunk resident and prefetches the chunk ahead of the actor", () => {
    const chunks: SliceManifest["chunks"] = [
      {
        id: "chunk-west",
        origin: { x: 0, y: 0, z: 0 },
        roadIds: [],
        size: { depth: 100, width: 100 }
      },
      {
        id: "chunk-center",
        origin: { x: 100, y: 0, z: 0 },
        roadIds: [],
        size: { depth: 100, width: 100 }
      },
      {
        id: "chunk-east",
        origin: { x: 200, y: 0, z: 0 },
        roadIds: [],
        size: { depth: 100, width: 100 }
      }
    ];

    expect(
      resolveResidentChunkIds(chunks, {
        facingYaw: Math.PI / 2,
        lookAheadMeters: 96,
        paddingMeters: 16,
        position: { x: 150, z: 50 }
      })
    ).toEqual(["chunk-center", "chunk-east"]);

    expect(
      resolveResidentChunkIds(chunks, {
        facingYaw: -Math.PI / 2,
        lookAheadMeters: 96,
        paddingMeters: 16,
        position: { x: 150, z: 50 }
      })
    ).toEqual(["chunk-west", "chunk-center"]);
  });

  it("builds explicit road surface, curb, and intersection meshes with stable material assignment", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = new TransformNode("chunk-root", scene);
    const roadMaterial = new StandardMaterial("road", scene);
    const curbMaterial = new StandardMaterial("curb", scene);
    const intersectionMaterial = new StandardMaterial("intersection", scene);
    const segments = buildRoadSegments(
      scene,
      parent,
      {
        id: "market-st",
        kind: "primary",
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 60 }
        ],
        width: 18
      },
      {
        curb: curbMaterial,
        intersection: intersectionMaterial,
        road: roadMaterial
      }
    );

    expect(segments).toHaveLength(5);
    expect(segments.filter((mesh) => mesh.name.includes("intersection"))).toHaveLength(2);
    expect(segments.filter((mesh) => mesh.name.includes("curb"))).toHaveLength(2);
    expect(segments.find((mesh) => mesh.name.includes("segment-0"))?.material).toBe(roadMaterial);
    expect(segments.filter((mesh) => mesh.name.includes("curb")).every((mesh) => mesh.material === curbMaterial)).toBe(true);
    expect(segments.filter((mesh) => mesh.name.includes("intersection")).every((mesh) => mesh.material === intersectionMaterial)).toBe(true);
    expect(segments.find((mesh) => mesh.name.includes("segment-0"))?.getBoundingInfo().boundingBox.extendSize.z).toBeCloseTo(30, 3);
    expect(segments.find((mesh) => mesh.name.includes("curb-left"))?.getBoundingInfo().boundingBox.extendSize.z).toBeCloseTo(21, 3);

    scene.dispose();
    engine.dispose();
  });

  it("builds chunk massing proxies from manifest entries and routes authored visuals through the asset seam", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const parent = new TransformNode("chunk-root", scene);
    const material = new StandardMaterial("chunk-massing", scene);
    const assetRegistry: AssetRegistry = {
      props: {},
      vehicles: {},
      world: {
        "building-1": {
          modelPath: "assets/models/world/building-1.glb",
          rootScale: 1,
          transformOffset: [0, 0, 0]
        }
      }
    };
    const manifest: Pick<SliceManifest, "worldEntries"> = {
      worldEntries: [
        {
          id: "world-ferry-building",
          chunkId: "chunk-0-0",
          districtId: "district-market-core",
          kind: "landmark",
          assetId: "building-1",
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
        },
        {
          id: "world-market-corridor",
          chunkId: "chunk-0-0",
          districtId: "district-market-core",
          kind: "building-massing",
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
        }
      ]
    };

    attachAuthoredVisualToProxyMock.mockResolvedValue(null);

    const buildings = await buildChunkMassing(parent, manifest, "chunk-0-0", material, assetRegistry);

    expect(buildings).toHaveLength(2);
    expect(buildings[0]?.material).toBe(material);
    expect(buildings[0]?.metadata).toMatchObject({
      worldAssetId: "building-1",
      worldEntryId: "world-ferry-building",
      worldEntryKind: "landmark",
      worldEntryLabel: "Ferry Building Proxy"
    });
    expect(buildings[1]?.metadata).toMatchObject({
      worldAssetId: null,
      worldEntryId: "world-market-corridor",
      worldEntryKind: "building-massing",
      worldEntryLabel: "Market Corridor"
    });
    expect(attachAuthoredVisualToProxyMock).toHaveBeenCalledTimes(1);
    expect(attachAuthoredVisualToProxyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: "world:building-1",
        entry: assetRegistry.world["building-1"],
        proxyMesh: buildings[0],
        scene,
        verticalOffset: -30
      })
    );

    scene.dispose();
    engine.dispose();
  });
});
