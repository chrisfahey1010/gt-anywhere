import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type Mesh,
  type Scene,
  type TransformNode
} from "@babylonjs/core";
import type { PedestrianInitialState, PedestrianPlanEntry } from "../../world/chunks/slice-manifest";

export type PedestrianState = PedestrianInitialState | "panic" | "struck";

export interface PedestrianSnapshot {
  calmState: PedestrianInitialState;
  currentState: PedestrianState;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CreatePedestrianActorOptions {
  parent: TransformNode;
  plan: PedestrianPlanEntry;
  scene: Scene;
}

export interface PedestrianActorRuntime {
  anchorPosition: Vector3;
  baseHeadingRadians: number;
  calmState: PedestrianInitialState;
  currentState: PedestrianState;
  getSnapshot(): PedestrianSnapshot;
  id: string;
  mesh: Mesh;
  panicTimeRemaining: number;
  setState(nextState: PedestrianState): void;
  stateTimeRemaining: number;
  walkDirection: 1 | -1;
  walkOffset: number;
  dispose(): void;
}

const PEDESTRIAN_HEIGHT = 1.7;
const PEDESTRIAN_WIDTH = 0.55;

function hashValue(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function createPedestrianStateDuration(state: PedestrianInitialState, seedValue: string): number {
  const hash = hashValue(`${seedValue}:${state}`);
  const baseDuration = state === "walking" ? 1.4 : state === "waiting" ? 1.1 : 0.9;

  return baseDuration + (hash % 4) * 0.15;
}

export function createPedestrianActor(options: CreatePedestrianActorOptions): PedestrianActorRuntime {
  const { parent, plan, scene } = options;
  const mesh = MeshBuilder.CreateBox(
    `pedestrian-${plan.id}`,
    {
      width: PEDESTRIAN_WIDTH,
      depth: PEDESTRIAN_WIDTH,
      height: PEDESTRIAN_HEIGHT
    },
    scene
  );
  const material = new StandardMaterial(`pedestrian-material-${plan.id}`, scene);
  const baseHeadingRadians = (plan.headingDegrees * Math.PI) / 180;
  const seedHash = hashValue(plan.id);
  const anchorPosition = new Vector3(plan.position.x, plan.position.y + PEDESTRIAN_HEIGHT / 2, plan.position.z);
  let calmState: PedestrianInitialState = plan.initialState;
  let currentState: PedestrianState = plan.initialState;

  material.diffuseColor = Color3.FromHexString("#f7c59f");
  mesh.parent = parent;
  mesh.material = material;
  mesh.position.copyFrom(anchorPosition);
  mesh.rotation.y = baseHeadingRadians;
  mesh.metadata = {
    interactionRole: "pedestrian",
    kind: "pedestrian",
    pedestrianId: plan.id,
    pedestrianState: plan.initialState
  };

  const runtime: PedestrianActorRuntime = {
    anchorPosition,
    baseHeadingRadians,
    calmState,
    currentState,
    getSnapshot: () => ({
      calmState,
      currentState,
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
      }
    }),
    id: plan.id,
    mesh,
    panicTimeRemaining: 0,
    setState: (nextState) => {
      currentState = nextState;

      if (nextState === "standing" || nextState === "walking" || nextState === "waiting") {
        calmState = nextState;
      }

      runtime.currentState = currentState;
      runtime.calmState = calmState;

      if (mesh.metadata && typeof mesh.metadata === "object") {
        Object.assign(mesh.metadata, {
          pedestrianState: nextState
        });
      }
    },
    stateTimeRemaining: createPedestrianStateDuration(plan.initialState, plan.id),
    walkDirection: seedHash % 2 === 0 ? 1 : -1,
    walkOffset: 0,
    dispose: () => {
      material.dispose();
      mesh.dispose();
    }
  };

  return runtime;
}
