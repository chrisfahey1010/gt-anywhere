import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene, Engine, NullEngine } from '@babylonjs/core';
import { createVehicleFactory, loadTuningProfile } from '../../src/vehicles/physics/vehicle-factory';
import type { PlayerVehicleController } from '../../src/vehicles/controllers/player-vehicle-controller';
import type { SpawnCandidate } from '../../src/world/chunks/slice-manifest';

// Mock fetch for tuning profile loading
const fetchMock = vi.fn();
globalThis.fetch = fetchMock as typeof fetch;

// Mock BabylonJS physics and mesh to avoid needing an actual physics engine in unit tests
vi.mock('@babylonjs/core', async () => {
  const actual = await vi.importActual<any>('@babylonjs/core');
  return {
    ...actual,
    PhysicsAggregate: vi.fn().mockImplementation((mesh, shape, options) => ({
      body: {
        setLinearDamping: vi.fn(),
        setAngularDamping: vi.fn(),
        getLinearVelocity: vi.fn().mockReturnValue(actual.Vector3.Zero()),
        setLinearVelocity: vi.fn(),
        setAngularVelocity: vi.fn(),
        getMassProperties: vi.fn().mockReturnValue({ mass: options?.mass || 0 }),
      },
      dispose: vi.fn()
    }))
  };
});

describe('Vehicle Factory & Tuning Profiles', () => {
  let engine: Engine;
  let scene: Scene;
  let mockController: PlayerVehicleController;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    mockController = {
      getState: vi.fn().mockReturnValue({ throttle: 0, brake: 0, steering: 0, handbrake: false })
    } as unknown as PlayerVehicleController;
    vi.clearAllMocks();
  });

  describe('Tuning Data Loading', () => {
    it('should load a tuning profile by vehicle type', async () => {
      const mockTuning = {
        name: 'Sports Car',
        mass: 1400,
        color: '#ff0000',
        maxForwardSpeed: 25,
        maxReverseSpeed: 10,
        maxTurnRate: 2.2,
        damage: {
          durability: 60,
          impactSpeedThreshold: 8
        },
        model: { bodyStyle: 'sports-car' as const },
        dimensions: { width: 1.8, height: 1.2, length: 4.2 }
      };
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTuning
      });

      const profile = await loadTuningProfile('sports-car');
      
      expect(fetchMock).toHaveBeenCalledWith('/data/tuning/sports-car.json');
      expect(profile).toEqual(mockTuning);
    });

    it('should throw an error if tuning profile cannot be loaded', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(loadTuningProfile('invalid-vehicle')).rejects.toThrow('Failed to load tuning profile for invalid-vehicle');
    });
  });

  describe('Vehicle Factory', () => {
    it('should create a vehicle with properties from the tuning profile', () => {
      const tuning = {
        name: 'Heavy Truck',
        mass: 5000,
        color: '#0000ff',
        maxForwardSpeed: 12,
        maxReverseSpeed: 5,
        maxTurnRate: 1.0,
        damage: {
          durability: 180,
          impactSpeedThreshold: 10
        },
        model: { bodyStyle: 'heavy-truck' as const },
        dimensions: { width: 2.5, height: 3.5, length: 7.0 }
      };

      const spawnCandidate: SpawnCandidate = {
        id: 'spawn-1',
        chunkId: 'chunk-0-0',
        roadId: 'road-0',
        position: { x: 0, y: 0, z: 0 },
        headingDegrees: 90,
        surface: 'road',
        laneIndex: 0,
        starterVehicle: {
          kind: 'starter-car',
          placement: 'lane-center',
          dimensions: { width: 1, height: 1, length: 1 }
        }
      };

      const vehicle = createVehicleFactory({
        scene,
        parent: null as any,
        spawnCandidate,
        controller: mockController,
        tuning
      });

      expect(vehicle.mesh).toBeDefined();
      expect(vehicle.physicsAggregate).toBeDefined();
      
      // Verify color is applied (via hex string)
      expect((vehicle.mesh.material as any).diffuseColor.toHexString().toLowerCase()).toBe(tuning.color.toLowerCase());
      
      // Verify mass is applied to physics body
      expect(vehicle.physicsAggregate.body.getMassProperties().mass).toBe(tuning.mass);
    });

    it('creates distinct visual meshes from the tuning model data', () => {
      const spawnCandidate: SpawnCandidate = {
        id: 'spawn-2',
        chunkId: 'chunk-0-0',
        roadId: 'road-0',
        position: { x: 0, y: 0, z: 0 },
        headingDegrees: 0,
        surface: 'road',
        laneIndex: 0,
        starterVehicle: {
          kind: 'starter-car',
          placement: 'lane-center',
          dimensions: { width: 1, height: 1, length: 1 }
        }
      };

      const sportsCar = createVehicleFactory({
        scene,
        parent: null as any,
        spawnCandidate,
        controller: mockController,
        tuning: {
          name: 'Sports Car',
          mass: 1200,
          color: '#ff0000',
          maxForwardSpeed: 25,
          maxReverseSpeed: 10,
          maxTurnRate: 2.2,
          damage: {
            durability: 60,
            impactSpeedThreshold: 8
          },
          model: { bodyStyle: 'sports-car' },
          dimensions: { width: 1.8, height: 1.2, length: 4.2 }
        }
      });

      const heavyTruck = createVehicleFactory({
        scene,
        parent: null as any,
        spawnCandidate,
        controller: mockController,
        tuning: {
          name: 'Heavy Truck',
          mass: 5000,
          color: '#0000ff',
          maxForwardSpeed: 12,
          maxReverseSpeed: 5,
          maxTurnRate: 1.0,
          damage: {
            durability: 180,
            impactSpeedThreshold: 10
          },
          model: { bodyStyle: 'heavy-truck' },
          dimensions: { width: 2.5, height: 3.5, length: 7.0 }
        }
      });

      expect(sportsCar.mesh.metadata.bodyStyle).toBe('sports-car');
      expect(heavyTruck.mesh.metadata.bodyStyle).toBe('heavy-truck');
      expect(sportsCar.mesh.getChildMeshes().map((mesh) => mesh.name)).toEqual(
        expect.arrayContaining([expect.stringContaining('rear-deck')])
      );
      expect(heavyTruck.mesh.getChildMeshes().map((mesh) => mesh.name)).toEqual(
        expect.arrayContaining([expect.stringContaining('cab'), expect.stringContaining('hauler')])
      );
    });
  });
});
