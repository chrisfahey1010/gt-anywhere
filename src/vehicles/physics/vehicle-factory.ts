import {
  Color3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  InstantiatedEntries
} from "@babylonjs/core";
import type { SliceSceneVisualPalette, SpawnCandidate } from "../../world/chunks/slice-manifest";
import type { PlayerVehicleController, VehicleControlState } from "../controllers/player-vehicle-controller";
import type { StarterVehicleRuntime } from "./create-starter-vehicle";
import { resolveVehicleTuningPath } from "../../app/config/runtime-paths";
import { loadAssetRegistry, loadAssetContainer } from "../../rendering/scene/asset-registry";
import { createLogger } from "../../app/logging/logger";

const logger = createLogger();

export interface VehicleTuning {
  name: string;
  mass: number;
  color: string;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  maxTurnRate: number;
  damage: {
    durability: number;
    impactSpeedThreshold: number;
  };
  model: {
    bodyStyle: "sedan" | "sports-car" | "heavy-truck";
  };
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
}

export interface CreateVehicleOptions {
  controller: PlayerVehicleController;
  metadata?: Record<string, unknown>;
  parent: TransformNode;
  scene: Scene;
  runtimeName?: string;
  spawnCandidate: SpawnCandidate;
  tuning: VehicleTuning;
  visualPalette?: Pick<SliceSceneVisualPalette, "vehicleAccentColor">;
}

const FORWARD_AXIS = new Vector3(0, 0, 1);
const VEHICLE_SCENE_ACCENT_BLEND = 0.2;
const tuningProfilePromises = new Map<string, Promise<VehicleTuning>>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clearVehicleTuningProfileCache(): void {
  tuningProfilePromises.clear();
}

export async function loadTuningProfile(vehicleType: string): Promise<VehicleTuning> {
  const cachedTuningProfile = tuningProfilePromises.get(vehicleType);

  if (cachedTuningProfile) {
    return cachedTuningProfile;
  }

  const tuningProfilePromise = fetch(resolveVehicleTuningPath(vehicleType))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load tuning profile for ${vehicleType}`);
      }

      return (await response.json()) as VehicleTuning;
    })
    .catch((error) => {
      tuningProfilePromises.delete(vehicleType);
      throw error;
    });

  tuningProfilePromises.set(vehicleType, tuningProfilePromise);

  return tuningProfilePromise;
}

function createProxyVisuals(
  scene: Scene,
  vehicleMesh: TransformNode,
  tuning: VehicleTuning,
  material: StandardMaterial
): TransformNode {
  const { width, height, length } = tuning.dimensions;
  const proxyRoot = new TransformNode(`${vehicleMesh.name}-proxy-root`, scene);
  proxyRoot.parent = vehicleMesh;

  const createVisualPart = (
    name: string,
    dimensions: { width: number; height: number; depth: number },
    position: Vector3
  ): void => {
    const part = MeshBuilder.CreateBox(`${vehicleMesh.name}-${name}`, dimensions, scene);
    part.parent = proxyRoot;
    part.position.copyFrom(position);
    part.material = material;
  };

  createVisualPart(
    "chassis",
    {
      width: width * 0.96,
      height: height * 0.24,
      depth: length * 0.84
    },
    new Vector3(0, -height * 0.18, 0)
  );

  switch (tuning.model.bodyStyle) {
    case "sedan":
      createVisualPart(
        "cabin",
        {
          width: width * 0.7,
          height: height * 0.34,
          depth: length * 0.32
        },
        new Vector3(0, height * 0.08, -length * 0.06)
      );
      break;
    case "sports-car":
      createVisualPart(
        "cockpit",
        {
          width: width * 0.62,
          height: height * 0.22,
          depth: length * 0.26
        },
        new Vector3(0, -height * 0.02, -length * 0.02)
      );
      createVisualPart(
        "rear-deck",
        {
          width: width * 0.68,
          height: height * 0.12,
          depth: length * 0.2
        },
        new Vector3(0, -height * 0.08, length * 0.24)
      );
      break;
    case "heavy-truck":
      createVisualPart(
        "cab",
        {
          width: width * 0.9,
          height: height * 0.48,
          depth: length * 0.24
        },
        new Vector3(0, 0, -length * 0.28)
      );
      createVisualPart(
        "hauler",
        {
          width: width * 0.94,
          height: height * 0.42,
          depth: length * 0.52
        },
        new Vector3(0, -height * 0.02, length * 0.1)
      );
      break;
  }

  return proxyRoot;
}

export function createVehicleFactory(options: CreateVehicleOptions): StarterVehicleRuntime {
  const { controller, metadata, parent, runtimeName, scene, spawnCandidate, tuning, visualPalette } = options;
  const { width, height, length } = tuning.dimensions;
  const resolvedBaseColor =
    visualPalette === undefined
      ? tuning.color
      : Color3.Lerp(
          Color3.FromHexString(tuning.color),
          Color3.FromHexString(visualPalette.vehicleAccentColor),
          VEHICLE_SCENE_ACCENT_BLEND
        )
          .toHexString()
          .toLowerCase();

  const vehicleMesh = MeshBuilder.CreateBox(
    runtimeName ?? `starter-vehicle-${spawnCandidate.id}`,
    { width, height, depth: length },
    scene
  );

  vehicleMesh.parent = parent;
  vehicleMesh.position = new Vector3(
    spawnCandidate.position.x,
    spawnCandidate.position.y + height / 2 + 1.4,
    spawnCandidate.position.z
  );
  vehicleMesh.rotation.y = (spawnCandidate.headingDegrees * Math.PI) / 180;
  vehicleMesh.isVisible = false;
  vehicleMesh.metadata = {
    bodyStyle: tuning.model.bodyStyle,
    runtimeName: vehicleMesh.name,
    tuningName: tuning.name,
    ...metadata,
    visualBaseColor: resolvedBaseColor
  };

  const material = new StandardMaterial(`vehicle-material-${spawnCandidate.id}`, scene);
  material.diffuseColor = Color3.FromHexString(resolvedBaseColor);
  vehicleMesh.material = material;

  let proxyRoot: TransformNode | null = createProxyVisuals(scene, vehicleMesh, tuning, material);
  let instantiatedAsset: InstantiatedEntries | null = null;
  let isDisposed = false;

  loadAssetRegistry()
    .then((registry) => {
      if (isDisposed) return;
      const entry = registry.vehicles[tuning.model.bodyStyle];
      if (!entry) {
        throw new Error(`Registry missing vehicle entry for ${tuning.model.bodyStyle}`);
      }
      return loadAssetContainer(tuning.model.bodyStyle, entry.modelPath, scene)
        .then((container) => ({ container, entry }));
    })
    .then((result) => {
      if (isDisposed || !result || !result.container) return;

      const { container, entry } = result;
      instantiatedAsset = container.instantiateModelsToScene((name) => `${vehicleMesh.name}-${name}`);
      
      const visualRoot = instantiatedAsset.rootNodes[0] as TransformNode;
      if (visualRoot) {
        visualRoot.parent = vehicleMesh;
        visualRoot.scaling.scaleInPlace(entry.rootScale);
        visualRoot.position.copyFromFloats(
          entry.transformOffset[0],
          entry.transformOffset[1],
          entry.transformOffset[2]
        );
        
        // Clone and apply materials properly if needed
        const clonedMaterials: StandardMaterial[] = [];
        visualRoot.getChildMeshes().forEach((child) => {
          if (child.material) {
            const mat = child.material.clone(`${child.name}-mat`) as StandardMaterial;
            child.material = mat;
            clonedMaterials.push(mat);
          }
        });
        
        // Add cloned materials to disposal list
        const originalDispose = instantiatedAsset.dispose.bind(instantiatedAsset);
        instantiatedAsset.dispose = () => {
          originalDispose();
          clonedMaterials.forEach(m => m.dispose());
        };

        // Reapply metadata to the visual root if needed
        visualRoot.metadata = { ...vehicleMesh.metadata };
      }

      if (proxyRoot) {
        proxyRoot.dispose();
        proxyRoot = null;
      }
    })
    .catch((error) => {
      if (!isDisposed) {
        logger.warn('asset-fallback', { assetId: tuning.model.bodyStyle, reason: error instanceof Error ? error.message : String(error) });
      }
    });

  const physicsAggregate = new PhysicsAggregate(
    vehicleMesh,
    PhysicsShapeType.BOX,
    {
      mass: tuning.mass,
      friction: 1,
      restitution: 0
    },
    scene
  );

  physicsAggregate.body.setLinearDamping(0.35);
  physicsAggregate.body.setAngularDamping(0.8);

  const driveDirection = new Vector3();

  return {
    mesh: vehicleMesh,
    physicsAggregate,
    update: (inputState?: VehicleControlState) => {
      const controls = inputState ?? controller.getState();
      const currentVelocity = physicsAggregate.body.getLinearVelocity();
      const forward = vehicleMesh.getDirection(FORWARD_AXIS).normalizeToRef(driveDirection);
      forward.y = 0;

      if (controls.handbrake) {
        physicsAggregate.body.setLinearVelocity(new Vector3(0, currentVelocity.y, 0));
        physicsAggregate.body.setAngularVelocity(Vector3.Zero());
        return;
      }

      const driveInput = clamp(controls.throttle - controls.brake, -1, 1);
      const targetSpeed =
        driveInput >= 0 ? driveInput * tuning.maxForwardSpeed : driveInput * tuning.maxReverseSpeed;
      const speedRatio = Math.max(Math.abs(targetSpeed) / tuning.maxForwardSpeed, 0.2);
      const steeringDirection = targetSpeed === 0 ? 1 : Math.sign(targetSpeed);

      physicsAggregate.body.setLinearVelocity(
        new Vector3(forward.x * targetSpeed, currentVelocity.y, forward.z * targetSpeed)
      );
      physicsAggregate.body.setAngularVelocity(
        new Vector3(0, controls.steering * tuning.maxTurnRate * speedRatio * steeringDirection, 0)
      );
    },
    dispose: () => {
      isDisposed = true;
      if (instantiatedAsset) {
        instantiatedAsset.rootNodes.forEach(node => node.dispose());
        instantiatedAsset.dispose();
      }
      if (proxyRoot) {
        proxyRoot.dispose();
        proxyRoot = null;
      }
      physicsAggregate.dispose();
      material.dispose();
      vehicleMesh.dispose();
    }
  };
}
