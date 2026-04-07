import {
  createWorldGenerationRequest,
  LocationResolver,
  type WorldGenerationRequest
} from "../../src/world/generation/location-resolver";
import {
  InMemorySliceManifestStore,
  type SliceManifestStore
} from "../../src/world/generation/slice-manifest-store";
import {
  DefaultWorldSliceGenerator,
  type GeoDataPreset,
  type GeoDataPresetSource
} from "../../src/world/generation/world-slice-generator";
import {
  validAddressLikeLocationQuery,
  validLocationAliasQuery,
  validLocationQuery,
  validSingleTokenLocationQuery,
  validStructuredLocationQuery
} from "../fixtures/location-queries";

describe("world slice generator", () => {
  async function createRequest(query: string): Promise<WorldGenerationRequest> {
    const resolver = new LocationResolver();
    const result = await resolver.resolve(query);

    if (!result.ok) {
      throw new Error(`Expected '${query}' to resolve successfully.`);
    }

    return createWorldGenerationRequest(result.value, () => "2026-04-07T00:00:00.000Z");
  }

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

  it("creates a serializable manifest with required fields and saves it through the manifest store", async () => {
    const manifestStore = new InMemorySliceManifestStore();
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(JSON.parse(JSON.stringify(result.manifest))).toMatchObject({
      sliceId: expect.any(String),
      generationVersion: expect.any(String),
      location: {
        placeName: "San Francisco, CA",
        reuseKey: "san-francisco-ca",
        sessionKey: "san-francisco-ca-story-1-1"
      },
      seed: "story-1-1",
      bounds: {
        minX: expect.any(Number),
        maxX: expect.any(Number),
        minZ: expect.any(Number),
        maxZ: expect.any(Number)
      },
      chunks: expect.any(Array),
      roads: expect.any(Array),
      spawnCandidates: expect.any(Array),
      sceneMetadata: {
        displayName: "San Francisco, CA"
      }
    });
    expect(result.spawnCandidate.id).toMatch(/^spawn-/);
    expect(manifestStore.getBySliceId(result.manifest.sliceId)).toEqual(result.manifest);
    expect(manifestStore.getByReuseKey("san-francisco-ca")).toEqual(result.manifest);
    expect(generator.getStoredManifest?.(result.manifest.sliceId)).toEqual(result.manifest);
    expect(generator.getStoredManifestByReuseKey?.("san-francisco-ca")).toEqual(result.manifest);
  });

  it("maps canonical aliases onto the same deterministic slice definition", async () => {
    const manifestStore = new InMemorySliceManifestStore();
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore
    });
    const aliasRequest = await createRequest(validLocationAliasQuery);
    const canonicalRequest = await createRequest(validLocationQuery);
    const aliasResult = await generator.generate(aliasRequest);
    const canonicalResult = await generator.generate(canonicalRequest);

    expect(aliasResult.ok).toBe(true);
    expect(canonicalResult.ok).toBe(true);

    if (!aliasResult.ok || !canonicalResult.ok) {
      return;
    }

    expect(aliasResult.manifest.sliceId).toBe(canonicalResult.manifest.sliceId);
    expect(aliasResult.manifest.roads).toEqual(canonicalResult.manifest.roads);
  });

  it.each([
    validLocationAliasQuery,
    validStructuredLocationQuery,
    validAddressLikeLocationQuery,
    validSingleTokenLocationQuery
  ])("creates a loadable deterministic slice for '%s'", async (query) => {
    const manifestStore: SliceManifestStore = new InMemorySliceManifestStore();
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore
    });
    const request = await createRequest(query);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.manifest.location.placeName).toBe(request.location.placeName);
    expect(result.manifest.roads.length).toBeGreaterThan(0);
    expect(result.manifest.chunks.length).toBeGreaterThan(0);
    expect(result.manifest.chunks.some((chunk) => chunk.id === result.spawnCandidate.chunkId)).toBe(true);
  });
});
