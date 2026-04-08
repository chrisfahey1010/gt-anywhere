import { describe, expect, it } from "vitest";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import {
  createHijackableVehicleSpawns,
  HIJACKABLE_VEHICLE_TYPES
} from "../../src/rendering/scene/hijackable-vehicle-spawns";

function createManifest(roads: SliceManifest["roads"]): SliceManifest {
  return {
    bounds: {
      minX: -120,
      maxX: 120,
      minZ: -120,
      maxZ: 120
    },
    chunks: [
      {
        id: "chunk-0-0",
        origin: { x: -120, y: 0, z: -120 },
        size: {
          width: 240,
          depth: 240
        },
        roadIds: roads.map((road) => road.id)
      }
    ],
    generationVersion: "test",
    location: {
      placeName: "Test City",
      reuseKey: "test-city",
      sessionKey: "test-city-session"
    },
    roads,
    sceneMetadata: {
      boundaryColor: "#000000",
      displayName: "Test City",
      districtName: "Downtown",
      groundColor: "#111111",
      roadColor: "#222222"
    },
    seed: "seed",
    sliceId: "slice",
    spawnCandidates: []
  };
}

function createSpawnCandidate(overrides: Partial<SpawnCandidate> = {}): SpawnCandidate {
  return {
    chunkId: "chunk-0-0",
    headingDegrees: 90,
    id: "spawn-0",
    laneIndex: 0,
    position: { x: -40, y: 0, z: -60 },
    roadId: "market-st",
    starterVehicle: {
      dimensions: {
        height: 1.6,
        length: 4.6,
        width: 2.2
      },
      kind: "starter-car",
      placement: "lane-center"
    },
    surface: "road",
    ...overrides
  };
}

describe("hijackable vehicle spawns", () => {
  it("creates a deterministic in-bounds set of secondary vehicles without blocking the starter spawn", () => {
    const manifest = createManifest([
      {
        id: "market-st",
        kind: "primary",
        points: [
          { x: -100, y: 0, z: -60 },
          { x: 100, y: 0, z: -60 }
        ],
        width: 18
      },
      {
        id: "cross-st",
        kind: "secondary",
        points: [
          { x: 20, y: 0, z: -100 },
          { x: 20, y: 0, z: 100 }
        ],
        width: 14
      },
      {
        id: "connector-rd",
        kind: "tertiary",
        points: [
          { x: -90, y: 0, z: 70 },
          { x: 90, y: 0, z: 40 }
        ],
        width: 12
      }
    ]);
    const spawnCandidate = createSpawnCandidate();

    const firstRun = createHijackableVehicleSpawns(manifest, spawnCandidate);
    const secondRun = createHijackableVehicleSpawns(manifest, spawnCandidate);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun).toHaveLength(3);
    expect(firstRun.map((spawn) => spawn.vehicleType)).toEqual(HIJACKABLE_VEHICLE_TYPES);
    expect(new Set(firstRun.map((spawn) => spawn.id)).size).toBe(firstRun.length);
    expect(firstRun.some((spawn) => spawn.roadId !== spawnCandidate.roadId)).toBe(true);

    firstRun.forEach((spawn) => {
      const deltaX = spawn.position.x - spawnCandidate.position.x;
      const deltaZ = spawn.position.z - spawnCandidate.position.z;
      const distanceFromStarter = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

      expect(spawn.position.x).toBeGreaterThanOrEqual(manifest.bounds.minX);
      expect(spawn.position.x).toBeLessThanOrEqual(manifest.bounds.maxX);
      expect(spawn.position.z).toBeGreaterThanOrEqual(manifest.bounds.minZ);
      expect(spawn.position.z).toBeLessThanOrEqual(manifest.bounds.maxZ);
      expect(distanceFromStarter).toBeGreaterThanOrEqual(24);
    });
  });

  it("falls back to multiple valid placements on the starter road when the slice only exposes one road", () => {
    const manifest = createManifest([
      {
        id: "market-st",
        kind: "primary",
        points: [
          { x: -100, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 }
        ],
        width: 18
      }
    ]);
    const spawnCandidate = createSpawnCandidate({
      headingDegrees: 90,
      position: { x: -50, y: 0, z: 0 }
    });

    const spawns = createHijackableVehicleSpawns(manifest, spawnCandidate);

    expect(spawns.length).toBeGreaterThanOrEqual(2);
    expect(spawns.every((spawn) => spawn.roadId === "market-st")).toBe(true);
    expect(spawns.every((spawn) => spawn.chunkId === "chunk-0-0")).toBe(true);
  });
});
