import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import type { SpawnCandidate } from "../../world/chunks/slice-manifest";
import type { PlayerVehicleController } from "../controllers/player-vehicle-controller";

export interface StarterVehicleRuntime {
  mesh: Mesh;
  physicsAggregate: PhysicsAggregate;
  update(): void;
  dispose(): void;
}

export interface CreateStarterVehicleOptions {
  scene: Scene;
  parent: TransformNode;
  spawnCandidate: SpawnCandidate;
  controller: PlayerVehicleController;
}

const FORWARD_AXIS = new Vector3(0, 0, 1);
const MAX_FORWARD_SPEED = 18;
const MAX_REVERSE_SPEED = 7;
const MAX_TURN_RATE = 1.8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createStarterVehicle(options: CreateStarterVehicleOptions): StarterVehicleRuntime {
  const { scene, parent, spawnCandidate, controller } = options;
  const { width, height, length } = spawnCandidate.starterVehicle.dimensions;
  const vehicleMesh = MeshBuilder.CreateBox(
    `starter-vehicle-${spawnCandidate.id}`,
    {
      width,
      height,
      depth: length
    },
    scene
  );

  vehicleMesh.parent = parent;
  vehicleMesh.position = new Vector3(
    spawnCandidate.position.x,
    spawnCandidate.position.y + height / 2 + 1.4,
    spawnCandidate.position.z
  );
  vehicleMesh.rotation.y = (spawnCandidate.headingDegrees * Math.PI) / 180;

  const material = new StandardMaterial(`starter-vehicle-material-${spawnCandidate.id}`, scene);
  material.diffuseColor = Color3.FromHexString("#f25f5c");
  vehicleMesh.material = material;

  const physicsAggregate = new PhysicsAggregate(
    vehicleMesh,
    PhysicsShapeType.BOX,
    {
      mass: 1200,
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
    update: () => {
      const controls = controller.getState();
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
        driveInput >= 0 ? driveInput * MAX_FORWARD_SPEED : driveInput * MAX_REVERSE_SPEED;
      const speedRatio = Math.max(Math.abs(targetSpeed) / MAX_FORWARD_SPEED, 0.2);
      const steeringDirection = targetSpeed === 0 ? 1 : Math.sign(targetSpeed);

      physicsAggregate.body.setLinearVelocity(
        new Vector3(forward.x * targetSpeed, currentVelocity.y, forward.z * targetSpeed)
      );
      physicsAggregate.body.setAngularVelocity(
        new Vector3(0, controls.steering * MAX_TURN_RATE * speedRatio * steeringDirection, 0)
      );
    },
    dispose: () => {
      physicsAggregate.dispose();
      material.dispose();
      vehicleMesh.dispose();
    }
  };
}
