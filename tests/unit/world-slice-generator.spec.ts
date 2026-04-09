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
import { createHijackableVehicleSpawns } from "../../src/rendering/scene/hijackable-vehicle-spawns";
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
              displayName: "Market Street",
              kind: "primary",
              width: 18,
              points: [
                { x: -280, y: 0, z: -200 },
                { x: 280, y: 0, z: 200 }
              ]
            },
            {
              id: "van-ness-ave",
              displayName: "Van Ness Avenue",
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
    expect(result.spawnCandidate).toMatchObject({
      roadId: "market-st",
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
    });
    expect(result.spawnCandidate).not.toHaveProperty("runtimeState");
    expect(result.manifest.roads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "market-st",
          displayName: "Market Street"
        }),
        expect.objectContaining({
          id: "van-ness-ave",
          displayName: "Van Ness Avenue"
        })
      ])
    );
    expect(manifestStore.getBySliceId(result.manifest.sliceId)).toEqual(result.manifest);
    expect(manifestStore.getByReuseKey("san-francisco-ca")).toEqual(result.manifest);
    expect(generator.getStoredManifest?.(result.manifest.sliceId)).toEqual(result.manifest);
    expect(generator.getStoredManifestByReuseKey?.("san-francisco-ca")).toEqual(result.manifest);
  });

  it("aligns the starter spawn heading to the selected road segment instead of using a fixed fallback", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const expectedHeadingDegrees = (Math.atan2(560, 400) * 180) / Math.PI;

    expect(result.spawnCandidate.headingDegrees).toBeCloseTo(expectedHeadingDegrees, 5);
    expect(result.spawnCandidate.position).not.toEqual({ x: -280, y: 0, z: -200 });
    expect(result.spawnCandidate.position.x).toBeGreaterThan(-280);
    expect(result.spawnCandidate.position.z).toBeGreaterThan(-200);
  });

  it("keeps the starter spawn inset from road ends and slice bounds for the car footprint", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const road = result.manifest.roads.find((candidate) => candidate.id === result.spawnCandidate.roadId);

    expect(road).toBeDefined();

    if (!road) {
      return;
    }

    const [start, end] = road.points;

    expect(start).toBeDefined();
    expect(end).toBeDefined();

    if (!start || !end) {
      return;
    }

    const { position, starterVehicle } = result.spawnCandidate;
    const startDistance = Math.hypot(position.x - start.x, position.z - start.z);
    const endDistance = Math.hypot(end.x - position.x, end.z - position.z);
    const minimumClearance = starterVehicle.dimensions.length;

    expect(startDistance).toBeGreaterThanOrEqual(minimumClearance);
    expect(endDistance).toBeGreaterThanOrEqual(minimumClearance);
    expect(position.x).toBeGreaterThan(result.manifest.bounds.minX + starterVehicle.dimensions.length / 2);
    expect(position.x).toBeLessThan(result.manifest.bounds.maxX - starterVehicle.dimensions.length / 2);
    expect(position.z).toBeGreaterThan(result.manifest.bounds.minZ + starterVehicle.dimensions.length / 2);
    expect(position.z).toBeLessThan(result.manifest.bounds.maxZ - starterVehicle.dimensions.length / 2);
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

  it("assigns deterministic friendly display names to fallback-generated roads", async () => {
    const generator = new DefaultWorldSliceGenerator({
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validSingleTokenLocationQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.manifest.roads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(result.manifest.location.reuseKey),
          displayName: "Arterial Road"
        }),
        expect.objectContaining({
          id: expect.stringContaining(result.manifest.location.reuseKey),
          displayName: "Cross Street"
        }),
        expect.objectContaining({
          id: expect.stringContaining(result.manifest.location.reuseKey),
          displayName: "Connector Lane"
        })
      ])
    );
    expect(result.manifest.roads.map((road) => road.displayName)).not.toContain(result.manifest.location.reuseKey);
  });

  it("adds a deterministic serializable traffic plan derived from the slice roads and chunk bounds", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const firstResult = await generator.generate(request);
    const secondResult = await generator.generate(request);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);

    if (!firstResult.ok || !secondResult.ok) {
      return;
    }

    expect(JSON.parse(JSON.stringify(firstResult.manifest.traffic))).toMatchObject({
      vehicles: expect.arrayContaining([
        expect.objectContaining({
          chunkId: expect.any(String),
          direction: expect.stringMatching(/forward|reverse/),
          headingDegrees: expect.any(Number),
          id: expect.any(String),
          position: {
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number)
          },
          roadId: expect.any(String),
          speedScale: expect.any(Number),
          startDistance: expect.any(Number),
          vehicleType: expect.any(String)
        })
      ])
    });
    expect(firstResult.manifest.traffic?.vehicles.length ?? 0).toBeGreaterThan(0);
    expect(firstResult.manifest.traffic).toEqual(secondResult.manifest.traffic);
  });

  it("keeps generated traffic clear of the starter spawn, slice edges, and hijackable vehicle placements", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const trafficVehicles = result.manifest.traffic?.vehicles ?? [];
    const hijackableSpawns = createHijackableVehicleSpawns(result.manifest, result.spawnCandidate);

    expect(trafficVehicles.length).toBeGreaterThan(0);

    trafficVehicles.forEach((trafficVehicle) => {
      const starterDistance = Math.hypot(
        trafficVehicle.position.x - result.spawnCandidate.position.x,
        trafficVehicle.position.z - result.spawnCandidate.position.z
      );

      expect(trafficVehicle.position.x).toBeGreaterThan(result.manifest.bounds.minX + 10);
      expect(trafficVehicle.position.x).toBeLessThan(result.manifest.bounds.maxX - 10);
      expect(trafficVehicle.position.z).toBeGreaterThan(result.manifest.bounds.minZ + 10);
      expect(trafficVehicle.position.z).toBeLessThan(result.manifest.bounds.maxZ - 10);
      expect(starterDistance).toBeGreaterThanOrEqual(36);

      hijackableSpawns.forEach((secondarySpawn) => {
        const secondaryDistance = Math.hypot(
          trafficVehicle.position.x - secondarySpawn.position.x,
          trafficVehicle.position.z - secondarySpawn.position.z
        );

        expect(secondaryDistance).toBeGreaterThanOrEqual(18);
      });
    });
  });

  it("adds a deterministic serializable pedestrian plan derived from slice roads and chunk bounds", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const firstResult = await generator.generate(request);
    const secondResult = await generator.generate(request);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);

    if (!firstResult.ok || !secondResult.ok) {
      return;
    }

    expect(JSON.parse(JSON.stringify(firstResult.manifest.pedestrians))).toMatchObject({
      pedestrians: expect.arrayContaining([
        expect.objectContaining({
          chunkId: expect.any(String),
          headingDegrees: expect.any(Number),
          id: expect.any(String),
          initialState: expect.stringMatching(/standing|walking|waiting/),
          offsetFromRoad: expect.any(Number),
          position: {
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number)
          },
          roadId: expect.any(String),
          startDistance: expect.any(Number)
        })
      ])
    });
    expect(firstResult.manifest.pedestrians?.pedestrians.length ?? 0).toBeGreaterThan(0);
    expect(firstResult.manifest.pedestrians).toEqual(secondResult.manifest.pedestrians);
  });

  it("keeps generated pedestrians clear of the starter spawn, slice edges, traffic starts, and hijackable vehicle placements", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const pedestrians = result.manifest.pedestrians?.pedestrians ?? [];
    const trafficVehicles = result.manifest.traffic?.vehicles ?? [];
    const hijackableSpawns = createHijackableVehicleSpawns(result.manifest, result.spawnCandidate);

    expect(pedestrians.length).toBeGreaterThan(0);

    pedestrians.forEach((pedestrian) => {
      const starterDistance = Math.hypot(
        pedestrian.position.x - result.spawnCandidate.position.x,
        pedestrian.position.z - result.spawnCandidate.position.z
      );

      expect(pedestrian.position.x).toBeGreaterThan(result.manifest.bounds.minX + 12);
      expect(pedestrian.position.x).toBeLessThan(result.manifest.bounds.maxX - 12);
      expect(pedestrian.position.z).toBeGreaterThan(result.manifest.bounds.minZ + 12);
      expect(pedestrian.position.z).toBeLessThan(result.manifest.bounds.maxZ - 12);
      expect(starterDistance).toBeGreaterThanOrEqual(30);

      trafficVehicles.forEach((trafficVehicle) => {
        const trafficDistance = Math.hypot(
          pedestrian.position.x - trafficVehicle.position.x,
          pedestrian.position.z - trafficVehicle.position.z
        );

        expect(trafficDistance).toBeGreaterThanOrEqual(14);
      });

      hijackableSpawns.forEach((secondarySpawn) => {
        const secondaryDistance = Math.hypot(
          pedestrian.position.x - secondarySpawn.position.x,
          pedestrian.position.z - secondarySpawn.position.z
        );

        expect(secondaryDistance).toBeGreaterThanOrEqual(14);
      });
    });
  });

  it("adds a deterministic serializable breakable-prop plan derived from slice roads and chunk bounds", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const firstResult = await generator.generate(request);
    const secondResult = await generator.generate(request);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);

    if (!firstResult.ok || !secondResult.ok) {
      return;
    }

    expect(JSON.parse(JSON.stringify(firstResult.manifest.breakableProps))).toMatchObject({
      props: expect.arrayContaining([
        expect.objectContaining({
          chunkId: expect.any(String),
          headingDegrees: expect.any(Number),
          id: expect.any(String),
          position: {
            x: expect.any(Number),
            y: expect.any(Number),
            z: expect.any(Number)
          },
          propType: expect.stringMatching(/barrier|bollard|hydrant|short-post|signpost/),
          roadId: expect.any(String),
          startDistance: expect.any(Number)
        })
      ])
    });

    const breakableProps = firstResult.manifest.breakableProps?.props ?? [];

    expect(breakableProps.length).toBeGreaterThan(0);
    expect(breakableProps.length).toBeLessThanOrEqual(8);
    expect(new Set(breakableProps.map((prop) => prop.id)).size).toBe(breakableProps.length);
    expect(firstResult.manifest.breakableProps).toEqual(secondResult.manifest.breakableProps);
  });

  it("keeps generated breakable props clear of the starter spawn, slice edges, traffic starts, pedestrians, and hijackable vehicle placements", async () => {
    const generator = new DefaultWorldSliceGenerator({
      geoDataPresetSource: createPresetSource(),
      manifestStore: new InMemorySliceManifestStore()
    });
    const request = await createRequest(validLocationAliasQuery);
    const result = await generator.generate(request);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const breakableProps = result.manifest.breakableProps?.props ?? [];
    const trafficVehicles = result.manifest.traffic?.vehicles ?? [];
    const pedestrians = result.manifest.pedestrians?.pedestrians ?? [];
    const hijackableSpawns = createHijackableVehicleSpawns(result.manifest, result.spawnCandidate);

    expect(breakableProps.length).toBeGreaterThan(0);

    breakableProps.forEach((prop) => {
      const starterDistance = Math.hypot(
        prop.position.x - result.spawnCandidate.position.x,
        prop.position.z - result.spawnCandidate.position.z
      );

      expect(prop.position.x).toBeGreaterThan(result.manifest.bounds.minX + 14);
      expect(prop.position.x).toBeLessThan(result.manifest.bounds.maxX - 14);
      expect(prop.position.z).toBeGreaterThan(result.manifest.bounds.minZ + 14);
      expect(prop.position.z).toBeLessThan(result.manifest.bounds.maxZ - 14);
      expect(starterDistance).toBeGreaterThanOrEqual(34);

      trafficVehicles.forEach((trafficVehicle) => {
        const trafficDistance = Math.hypot(
          prop.position.x - trafficVehicle.position.x,
          prop.position.z - trafficVehicle.position.z
        );

        expect(trafficDistance).toBeGreaterThanOrEqual(18);
      });

      pedestrians.forEach((pedestrian) => {
        const pedestrianDistance = Math.hypot(
          prop.position.x - pedestrian.position.x,
          prop.position.z - pedestrian.position.z
        );

        expect(pedestrianDistance).toBeGreaterThanOrEqual(16);
      });

      hijackableSpawns.forEach((secondarySpawn) => {
        const secondaryDistance = Math.hypot(
          prop.position.x - secondarySpawn.position.x,
          prop.position.z - secondarySpawn.position.z
        );

        expect(secondaryDistance).toBeGreaterThanOrEqual(18);
      });
    });
  });
});
