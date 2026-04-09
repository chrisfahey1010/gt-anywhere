import type { Scene, TransformNode } from "@babylonjs/core";
import {
  createPedestrianSystem,
  type CreatePedestrianSystemOptions,
  type PedestrianCollision,
  type PedestrianEvent,
  type PedestrianSystem,
  type PedestrianThreat
} from "../../pedestrians/runtime/pedestrian-system";
import type { SliceManifest } from "../../world/chunks/slice-manifest";

export interface ScenePedestrianActor {
  mesh: {
    name: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
}

export interface ScenePedestrianVehicleActor extends ScenePedestrianActor {
  physicsAggregate: {
    body: {
      getLinearVelocity(): {
        x: number;
        y: number;
        z: number;
      };
    };
  };
}

export interface CreateScenePedestrianSystemOptions {
  createPedestrianSystem?: (options: CreatePedestrianSystemOptions) => PedestrianSystem;
  manifest: Pick<SliceManifest, "pedestrians">;
  parent: TransformNode;
  scene: Scene;
}

export interface UpdateScenePedestriansOptions {
  activeVehicle: ScenePedestrianVehicleActor;
  deltaSeconds: number;
  onFootActor?: ScenePedestrianActor | null;
  pedestrianSystem: PedestrianSystem | null;
}

export interface ApplyPedestrianSceneTelemetryOptions {
  canvas: HTMLCanvasElement;
  events: readonly PedestrianEvent[];
  pedestrianSystem: PedestrianSystem | null;
  scene: Pick<Scene, "metadata">;
}

const ON_FOOT_THREAT_RADIUS = 3;
const VEHICLE_COLLISION_RADIUS = 2.4;
const VEHICLE_IMPACT_SPEED_THRESHOLD = 2.5;
const VEHICLE_THREAT_RADIUS = 7;

function getVehicleSpeed(actor: ScenePedestrianVehicleActor): number {
  const velocity = actor.physicsAggregate.body.getLinearVelocity();

  return Math.hypot(velocity.x, velocity.z);
}

function createThreats(options: {
  activeVehicle: ScenePedestrianVehicleActor;
  onFootActor?: ScenePedestrianActor | null;
}): PedestrianThreat[] {
  const threats: PedestrianThreat[] = [
    {
      id: options.activeVehicle.mesh.name,
      kind: "vehicle",
      position: options.activeVehicle.mesh.position,
      radius: VEHICLE_THREAT_RADIUS
    }
  ];

  if (options.onFootActor) {
    threats.push({
      id: options.onFootActor.mesh.name,
      kind: "player",
      position: options.onFootActor.mesh.position,
      radius: ON_FOOT_THREAT_RADIUS
    });
  }

  return threats;
}

function createVehicleCollisions(
  pedestrianSystem: PedestrianSystem,
  activeVehicle: ScenePedestrianVehicleActor
): PedestrianCollision[] {
  const vehicleSpeed = getVehicleSpeed(activeVehicle);

  if (vehicleSpeed < VEHICLE_IMPACT_SPEED_THRESHOLD) {
    return [];
  }

  return pedestrianSystem.getPedestrians().flatMap((pedestrian) => {
    const distance = Math.hypot(
      pedestrian.mesh.position.x - activeVehicle.mesh.position.x,
      pedestrian.mesh.position.z - activeVehicle.mesh.position.z
    );

    if (distance > VEHICLE_COLLISION_RADIUS) {
      return [];
    }

    return [
      {
        impactSpeed: vehicleSpeed,
        pedestrianId: pedestrian.id,
        sourceId: activeVehicle.mesh.name
      }
    ];
  });
}

export function createScenePedestrianSystem(options: CreateScenePedestrianSystemOptions): PedestrianSystem | null {
  const plan = options.manifest.pedestrians;

  if (!plan || plan.pedestrians.length === 0) {
    return null;
  }

  return (options.createPedestrianSystem ?? createPedestrianSystem)({
    parent: options.parent,
    plan,
    scene: options.scene
  });
}

export function disposeScenePedestrianSystem(pedestrianSystem: PedestrianSystem | null): void {
  pedestrianSystem?.dispose();
}

export function updateScenePedestrians(options: UpdateScenePedestriansOptions): PedestrianEvent[] {
  const { activeVehicle, deltaSeconds, onFootActor, pedestrianSystem } = options;

  if (pedestrianSystem === null) {
    return [];
  }

  return pedestrianSystem.update({
    collisions: createVehicleCollisions(pedestrianSystem, activeVehicle),
    deltaSeconds,
    threats: createThreats({ activeVehicle, onFootActor })
  });
}

function createPedestrianStateSummary(pedestrianSystem: PedestrianSystem | null): string {
  if (pedestrianSystem === null) {
    return "";
  }

  const stateCounts = new Map<string, number>();

  pedestrianSystem.getPedestrians().forEach((pedestrian) => {
    const state = pedestrian.getSnapshot().currentState;
    stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
  });

  return [...stateCounts.entries()]
    .sort(([leftState], [rightState]) => leftState.localeCompare(rightState))
    .map(([state, count]) => `${state}:${count}`)
    .join(",");
}

export function applyPedestrianSceneTelemetry(options: ApplyPedestrianSceneTelemetryOptions): void {
  const { canvas, events, pedestrianSystem, scene } = options;
  const pedestrians = pedestrianSystem?.getPedestrians() ?? [];
  const pedestrianIds = pedestrians.map((pedestrian) => pedestrian.id);
  const pedestrianStates = createPedestrianStateSummary(pedestrianSystem);
  const recentEventTypes = events.map((event) => event.type);

  if (scene.metadata && typeof scene.metadata === "object") {
    Object.assign(scene.metadata, {
      pedestrianCount: pedestrians.length,
      pedestrianIds,
      pedestrianRecentEventTypes: recentEventTypes,
      pedestrianStates
    });
  }

  canvas.dataset.pedestrianCount = String(pedestrians.length);
  canvas.dataset.pedestrianIds = pedestrianIds.join(",");
  canvas.dataset.pedestrianRecentEvents = recentEventTypes.join(",");
  canvas.dataset.pedestrianStates = pedestrianStates;
}
