import { Vector3, type Scene, type TransformNode } from "@babylonjs/core";
import type { SliceSceneVisualPalette, TrafficVehiclePlan, SpawnCandidate } from "../../world/chunks/slice-manifest";
import { createPristineVehicleDamageState, type VehicleDamageState } from "../../vehicles/damage/vehicle-damage-policy";
import type { PlayerVehicleController, VehicleControlState } from "../../vehicles/controllers/player-vehicle-controller";
import { createVehicleFactory, type VehicleTuning } from "../../vehicles/physics/vehicle-factory";

export interface TrafficVehicleMesh {
  getDirection?(axis: Vector3): Vector3;
  metadata?: Record<string, unknown>;
  name: string;
  position: Vector3;
  rotation: {
    y: number;
  };
}

export interface TrafficVehiclePhysicsBody {
  getLinearVelocity(): Vector3;
}

export interface TrafficVehicleRuntime {
  damageState: VehicleDamageState;
  id: string;
  mesh: TrafficVehicleMesh;
  physicsAggregate: {
    body: TrafficVehiclePhysicsBody;
  };
  tuning: VehicleTuning;
  vehicleType: TrafficVehiclePlan["vehicleType"];
  update(controlState: VehicleControlState): void;
  dispose(): void;
}

export interface CreateTrafficVehicleOptions {
  controller: PlayerVehicleController;
  parent: TransformNode;
  plan: TrafficVehiclePlan;
  scene: Scene;
  starterVehicle: SpawnCandidate["starterVehicle"];
  tuning: VehicleTuning;
  visualPalette?: Pick<SliceSceneVisualPalette, "vehicleAccentColor">;
}

function createTrafficSpawnCandidate(
  plan: TrafficVehiclePlan,
  starterVehicle: SpawnCandidate["starterVehicle"]
): SpawnCandidate {
  return {
    chunkId: plan.chunkId,
    headingDegrees: plan.headingDegrees,
    id: plan.id,
    laneIndex: 0,
    position: plan.position,
    roadId: plan.roadId,
    starterVehicle,
    surface: "road"
  };
}

export function createTrafficVehicle(options: CreateTrafficVehicleOptions): TrafficVehicleRuntime {
  const runtime = createVehicleFactory({
    controller: options.controller,
    metadata: {
      interactionRole: "traffic",
      trafficVehicleId: options.plan.id
    },
    parent: options.parent,
    runtimeName: `traffic-vehicle-${options.plan.id}`,
    scene: options.scene,
    spawnCandidate: createTrafficSpawnCandidate(options.plan, options.starterVehicle),
    tuning: options.tuning,
    visualPalette: options.visualPalette
  });

  return {
    damageState: createPristineVehicleDamageState(),
    dispose: runtime.dispose,
    id: options.plan.id,
    mesh: runtime.mesh,
    physicsAggregate: runtime.physicsAggregate,
    tuning: options.tuning,
    vehicleType: options.plan.vehicleType,
    update: (controlState) => {
      runtime.update(controlState);
    }
  };
}
