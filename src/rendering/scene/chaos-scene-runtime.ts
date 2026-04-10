import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type Mesh,
  type Scene,
  type Vector3
} from "@babylonjs/core";
import {
  createBreakablePropSystem,
  type BreakablePropBrokenEvent,
  type BreakablePropSnapshot,
  type BreakablePropSystem
} from "../../sandbox/chaos/breakable-prop-system";
import {
  createVehicleDamageSystem,
  type VehicleDamageEvent,
  type VehicleDamageSystem
} from "../../vehicles/damage/vehicle-damage-system";
import type { VehicleDamageState } from "../../vehicles/damage/vehicle-damage-policy";
import type { VehicleTuning } from "../../vehicles/physics/vehicle-factory";
import type { BreakablePropPlanEntry, BreakablePropType, SliceManifest } from "../../world/chunks/slice-manifest";

export type ChaosSceneEvent = BreakablePropBrokenEvent | VehicleDamageEvent;

export interface SceneChaosVehicleMesh {
  material?: unknown;
  metadata?: Record<string, unknown>;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface SceneChaosVehicleActor {
  damageState: VehicleDamageState;
  mesh: SceneChaosVehicleMesh;
  physicsAggregate: {
    body: {
      getLinearVelocity(): Vector3;
    };
  };
  tuning: Pick<VehicleTuning, "color" | "damage" | "dimensions">;
  vehicleType: string;
}

export interface SceneBreakablePropRuntime extends BreakablePropSnapshot {
  mesh: Mesh;
}

export interface SceneChaosRuntime {
  dispose(): void;
  getBreakableProps(): SceneBreakablePropRuntime[];
}

export interface CreateSceneChaosRuntimeOptions {
  manifest: Pick<SliceManifest, "breakableProps">;
  parent: TransformNode;
  scene: Scene;
}

export interface UpdateSceneChaosOptions {
  activeVehicle: SceneChaosVehicleActor;
  combatPropHits?: readonly SceneChaosPropHit[];
  combatVehicleHits?: readonly SceneChaosVehicleHit[];
  deltaSeconds: number;
  hijackableVehicles: readonly SceneChaosVehicleActor[];
  runtime: SceneChaosRuntime;
  trafficVehicles: readonly SceneChaosVehicleActor[];
}

export interface SceneChaosVehicleHit {
  impactSpeed: number;
  sourceId: string;
  targetVehicleId: string;
}

export interface SceneChaosPropHit {
  impactSpeed: number;
  propId: string;
  sourceId: string;
}

export interface ApplyChaosSceneTelemetryOptions {
  canvas: HTMLCanvasElement;
  events: readonly ChaosSceneEvent[];
  runtime: SceneChaosRuntime;
  scene: Pick<Scene, "metadata">;
  vehicles: readonly SceneChaosVehicleActor[];
}

interface PropVisualConfig {
  color: string;
  collisionRadius: number;
  depth?: number;
  diameter?: number;
  height: number;
  kind: "box" | "cylinder";
  width?: number;
}

interface PropVisualHandle {
  entry: BreakablePropPlanEntry;
  material: StandardMaterial;
  mesh: Mesh;
}

interface RuntimeState extends SceneChaosRuntime {
  breakablePropSystem: BreakablePropSystem;
  currentTimeSeconds: number;
  getBreakableProps(): SceneBreakablePropRuntime[];
  propVisuals: Map<string, PropVisualHandle>;
  vehicleDamageSystem: VehicleDamageSystem;
}

const BROKEN_PROP_COLOR = Color3.FromHexString("#5f6368");
const BROKEN_VEHICLE_COLOR = Color3.FromHexString("#4b4b4b");

const PROP_VISUALS: Record<BreakablePropType, PropVisualConfig> = {
  barrier: {
    color: "#ffb74d",
    collisionRadius: 1.25,
    depth: 0.6,
    height: 0.8,
    kind: "box",
    width: 1.8
  },
  bollard: {
    color: "#b0bec5",
    collisionRadius: 0.7,
    diameter: 0.45,
    height: 1.1,
    kind: "cylinder"
  },
  hydrant: {
    color: "#ef5350",
    collisionRadius: 0.85,
    diameter: 0.65,
    height: 1.2,
    kind: "cylinder"
  },
  "short-post": {
    color: "#90a4ae",
    collisionRadius: 0.65,
    diameter: 0.35,
    height: 0.9,
    kind: "cylinder"
  },
  signpost: {
    color: "#f6d365",
    collisionRadius: 0.85,
    depth: 0.35,
    height: 2.6,
    kind: "box",
    width: 0.35
  }
};

function calculateHorizontalDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function getVehicleSpeed(actor: SceneChaosVehicleActor): number {
  const velocity = actor.physicsAggregate.body.getLinearVelocity();

  return Math.hypot(velocity.x, velocity.z);
}

function getRelativeImpactSpeed(left: SceneChaosVehicleActor, right: SceneChaosVehicleActor): number {
  const leftVelocity = left.physicsAggregate.body.getLinearVelocity();
  const rightVelocity = right.physicsAggregate.body.getLinearVelocity();

  return Math.hypot(leftVelocity.x - rightVelocity.x, leftVelocity.z - rightVelocity.z);
}

function getVehicleCollisionRadius(actor: SceneChaosVehicleActor): number {
  return Math.max(actor.tuning.dimensions.width, actor.tuning.dimensions.length) * 0.35;
}

function getPropCollisionRadius(propType: BreakablePropType): number {
  return PROP_VISUALS[propType].collisionRadius;
}

function createPropMesh(handle: PropVisualHandle, parent: TransformNode, scene: Scene): void {
  const config = PROP_VISUALS[handle.entry.propType];
  const mesh =
    config.kind === "box"
      ? MeshBuilder.CreateBox(
          `breakable-prop-${handle.entry.id}`,
          {
            width: config.width ?? 0.4,
            height: config.height,
            depth: config.depth ?? 0.4
          },
          scene
        )
      : MeshBuilder.CreateCylinder(
          `breakable-prop-${handle.entry.id}`,
          {
            diameter: config.diameter ?? 0.4,
            height: config.height,
            tessellation: 12
          },
          scene
        );

  const material = new StandardMaterial(`breakable-prop-material-${handle.entry.id}`, scene);

  material.diffuseColor = Color3.FromHexString(config.color);
  mesh.material = material;
  mesh.parent = parent;
  mesh.position.set(handle.entry.position.x, config.height / 2, handle.entry.position.z);
  mesh.rotation.y = (handle.entry.headingDegrees * Math.PI) / 180;
  mesh.checkCollisions = true;
  mesh.metadata = {
    breakState: "intact",
    breakablePropId: handle.entry.id,
    interactionRole: "breakable-prop",
    propType: handle.entry.propType
  };
  handle.material = material;
  handle.mesh = mesh;
}

function applyBrokenPropVisual(handle: PropVisualHandle): void {
  handle.material.diffuseColor = BROKEN_PROP_COLOR.clone();
  handle.mesh.checkCollisions = false;
  handle.mesh.rotation.z = Math.PI / 2;
  handle.mesh.scaling.y = 0.35;

  if (handle.mesh.metadata && typeof handle.mesh.metadata === "object") {
    Object.assign(handle.mesh.metadata, {
      breakState: "broken"
    });
  }
}

function applyVehicleDamageVisual(actor: SceneChaosVehicleActor): void {
  const normalizedSeverity = actor.damageState.normalizedSeverity;
  const material = actor.mesh.material;

  if (material instanceof StandardMaterial) {
    const baseColor = Color3.FromHexString(actor.tuning.color);
    material.diffuseColor = Color3.Lerp(baseColor, BROKEN_VEHICLE_COLOR, Math.min(0.65, normalizedSeverity));
  }

  if (actor.mesh.metadata && typeof actor.mesh.metadata === "object") {
    Object.assign(actor.mesh.metadata, {
      damageAccumulated: actor.damageState.accumulatedDamage,
      damageNormalizedSeverity: actor.damageState.normalizedSeverity,
      damageSeverity:
        normalizedSeverity >= 0.5 ? "heavy" : normalizedSeverity >= 0.1 ? "moderate" : normalizedSeverity > 0 ? "minor" : "none"
    });
  }
}

function collectVehiclePairImpacts(vehicles: readonly SceneChaosVehicleActor[]) {
  return vehicles.flatMap((vehicle, index) => {
    return vehicles.slice(index + 1).flatMap((otherVehicle) => {
      const collisionDistance = getVehicleCollisionRadius(vehicle) + getVehicleCollisionRadius(otherVehicle);
      const distance = calculateHorizontalDistance(vehicle.mesh.position, otherVehicle.mesh.position);

      if (distance > collisionDistance) {
        return [];
      }

      const impactSpeed = getRelativeImpactSpeed(vehicle, otherVehicle);

      if (impactSpeed <= 0) {
        return [];
      }

      return [
        {
          impactSpeed,
          sourceId: otherVehicle.mesh.name,
          sourceType: "vehicle" as const,
          targetVehicleId: vehicle.mesh.name
        },
        {
          impactSpeed,
          sourceId: vehicle.mesh.name,
          sourceType: "vehicle" as const,
          targetVehicleId: otherVehicle.mesh.name
        }
      ];
    });
  });
}

function collectVehiclePropImpacts(runtime: RuntimeState, vehicles: readonly SceneChaosVehicleActor[]) {
  const propSnapshots = runtime.getBreakableProps().filter((prop) => prop.breakState === "intact");
  const propImpacts: Array<Parameters<BreakablePropSystem["update"]>[0]["impacts"][number]> = [];
  const vehicleImpacts: Array<Parameters<VehicleDamageSystem["update"]>[0]["impacts"][number]> = [];

  vehicles.forEach((vehicle) => {
    const impactSpeed = getVehicleSpeed(vehicle);

    if (impactSpeed <= 0) {
      return;
    }

    propSnapshots.forEach((prop) => {
      const distance = calculateHorizontalDistance(vehicle.mesh.position, prop.mesh.position);
      const collisionDistance = getVehicleCollisionRadius(vehicle) + getPropCollisionRadius(prop.propType);

      if (distance > collisionDistance) {
        return;
      }

      propImpacts.push({
        impactSpeed,
        propId: prop.id,
        sourceId: vehicle.mesh.name
      });
      vehicleImpacts.push({
        impactSpeed,
        sourceId: prop.id,
        sourceType: "prop",
        targetVehicleId: vehicle.mesh.name
      });
    });
  });

  return { propImpacts, vehicleImpacts };
}

export function createSceneChaosRuntime(options: CreateSceneChaosRuntimeOptions): SceneChaosRuntime {
  const plan = options.manifest.breakableProps ?? { props: [] };
  const propVisuals = new Map<string, PropVisualHandle>();

  plan.props.forEach((entry) => {
    const handle = {
      entry,
      material: null as unknown as StandardMaterial,
      mesh: null as unknown as Mesh
    };

    createPropMesh(handle, options.parent, options.scene);
    propVisuals.set(entry.id, handle);
  });

  const breakablePropSystem = createBreakablePropSystem(plan);
  const vehicleDamageSystem = createVehicleDamageSystem();

  const runtime: RuntimeState = {
    breakablePropSystem,
    currentTimeSeconds: 0,
    dispose: () => {
      propVisuals.forEach((handle) => {
        handle.material.dispose();
        handle.mesh.dispose();
      });
      propVisuals.clear();
    },
    getBreakableProps: () => {
      return breakablePropSystem.getProps().flatMap((prop) => {
        const handle = propVisuals.get(prop.id);

        if (!handle) {
          return [];
        }

        return [
          {
            ...prop,
            mesh: handle.mesh
          }
        ];
      });
    },
    propVisuals,
    vehicleDamageSystem
  };

  return runtime;
}

export function disposeSceneChaosRuntime(runtime: SceneChaosRuntime | null): void {
  runtime?.dispose();
}

export function updateSceneChaos(options: UpdateSceneChaosOptions): ChaosSceneEvent[] {
  const runtime = options.runtime as RuntimeState;
  const vehicles = [options.activeVehicle, ...options.hijackableVehicles, ...options.trafficVehicles];

  runtime.currentTimeSeconds += options.deltaSeconds;

  const vehicleImpacts: Array<Parameters<VehicleDamageSystem["update"]>[0]["impacts"][number]> = collectVehiclePairImpacts(vehicles);
  const { propImpacts, vehicleImpacts: propVehicleImpacts } = collectVehiclePropImpacts(runtime, vehicles);

  vehicleImpacts.push(...propVehicleImpacts);
  vehicleImpacts.push(
    ...(options.combatVehicleHits ?? []).map((impact) => ({
      impactSpeed: impact.impactSpeed,
      sourceId: impact.sourceId,
      sourceType: "combat" as const,
      targetVehicleId: impact.targetVehicleId
    }))
  );

  const propEvents = runtime.breakablePropSystem.update({
    currentTimeSeconds: runtime.currentTimeSeconds,
    impacts: [
      ...propImpacts,
      ...((options.combatPropHits ?? []).map((impact) => ({
        impactSpeed: impact.impactSpeed,
        propId: impact.propId,
        sourceId: impact.sourceId
      })) as typeof propImpacts)
    ]
  });

  propEvents.forEach((event) => {
    const handle = runtime.propVisuals.get(event.propId);

    if (handle) {
      applyBrokenPropVisual(handle);
    }
  });

  const damageEvents = runtime.vehicleDamageSystem.update({
    currentTimeSeconds: runtime.currentTimeSeconds,
    impacts: vehicleImpacts,
    vehicles: vehicles.map((vehicle) => ({
      damageState: vehicle.damageState,
      id: vehicle.mesh.name,
      tuning: vehicle.tuning
    }))
  });

  vehicles.forEach((vehicle) => {
    const snapshot = runtime.vehicleDamageSystem.getVehicleDamage(vehicle.mesh.name);

    if (!snapshot) {
      return;
    }

    vehicle.damageState = {
      accumulatedDamage: snapshot.accumulatedDamage,
      normalizedSeverity: snapshot.normalizedSeverity
    };
    applyVehicleDamageVisual(vehicle);
  });

  return [...propEvents, ...damageEvents];
}

export function applyChaosSceneTelemetry(options: ApplyChaosSceneTelemetryOptions): void {
  const { canvas, events, runtime, scene, vehicles } = options;
  const recentEventTypes = events.slice(-4).map((event) => event.type);
  const damagedVehicles = vehicles.filter((vehicle) => vehicle.damageState.normalizedSeverity > 0);
  const damagedVehicleIds = damagedVehicles.map((vehicle) => vehicle.mesh.name);
  const brokenProps = runtime.getBreakableProps().filter((prop) => prop.breakState === "broken");
  const brokenPropIds = brokenProps.map((prop) => prop.id);

  if (scene.metadata && typeof scene.metadata === "object") {
    Object.assign(scene.metadata, {
      brokenPropCount: brokenProps.length,
      brokenPropIds,
      chaosRecentEventTypes: recentEventTypes,
      damagedVehicleCount: damagedVehicles.length,
      damagedVehicleIds
    });
  }

  canvas.dataset.brokenPropCount = String(brokenProps.length);
  canvas.dataset.brokenPropIds = brokenPropIds.join(",");
  canvas.dataset.chaosRecentEvents = recentEventTypes.join(",");
  canvas.dataset.damagedVehicleCount = String(damagedVehicles.length);
  canvas.dataset.damagedVehicleIds = damagedVehicleIds.join(",");
}
