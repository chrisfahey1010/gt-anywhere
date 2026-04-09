import type { VehicleTuning } from "../physics/vehicle-factory";
import {
  applyVehicleTransferDamagePolicy,
  createPristineVehicleDamageState,
  createVehicleDamageState,
  type VehicleDamageState
} from "./vehicle-damage-policy";

export type VehicleImpactSourceType = "prop" | "vehicle";

export type VehicleDamageSeverity = "minor" | "moderate" | "heavy";

export interface DamageableVehicle {
  damageState?: VehicleDamageState;
  id: string;
  tuning: Pick<VehicleTuning, "damage">;
}

export interface VehicleImpact {
  impactSpeed: number;
  sourceId: string;
  sourceType: VehicleImpactSourceType;
  targetVehicleId: string;
}

export interface VehicleDamageSnapshot extends VehicleDamageState {
  severity: VehicleDamageSeverity;
}

export interface VehicleDamageEvent {
  damageDelta: number;
  damageState: VehicleDamageSnapshot;
  impactSpeed: number;
  sourceId: string;
  sourceType: VehicleImpactSourceType;
  targetVehicleId: string;
  type: "vehicle.damaged";
}

export interface VehicleDamageSystem {
  getVehicleDamage(vehicleId: string): VehicleDamageSnapshot | null;
  update(options: {
    currentTimeSeconds: number;
    impacts: readonly VehicleImpact[];
    vehicles: readonly DamageableVehicle[];
  }): VehicleDamageEvent[];
}

interface StoredVehicleDamage {
  damageState: VehicleDamageState;
  tuning: DamageableVehicle["tuning"];
}

const CONTACT_COOLDOWN_SECONDS = 0.3;

function classifyVehicleDamageSeverity(normalizedSeverity: number): VehicleDamageSeverity {
  if (normalizedSeverity >= 0.5) {
    return "heavy";
  }

  if (normalizedSeverity >= 0.1) {
    return "moderate";
  }

  return "minor";
}

function createVehicleDamageSnapshot(state: VehicleDamageState): VehicleDamageSnapshot {
  const damageState = applyVehicleTransferDamagePolicy(state);

  return {
    ...damageState,
    severity: classifyVehicleDamageSeverity(damageState.normalizedSeverity)
  };
}

function createImpactKey(impact: VehicleImpact): string {
  return `${impact.targetVehicleId}:${impact.sourceType}:${impact.sourceId}`;
}

export function createVehicleDamageSystem(): VehicleDamageSystem {
  const vehicles = new Map<string, StoredVehicleDamage>();
  const recentContacts = new Map<string, number>();

  const syncVehicles = (runtimeVehicles: readonly DamageableVehicle[]): void => {
    runtimeVehicles.forEach((vehicle) => {
      const syncedDamageState = vehicle.damageState
        ? applyVehicleTransferDamagePolicy(vehicle.damageState)
        : createPristineVehicleDamageState();
      const storedVehicle = vehicles.get(vehicle.id);

      if (!storedVehicle) {
        vehicles.set(vehicle.id, {
          damageState: syncedDamageState,
          tuning: vehicle.tuning
        });
        return;
      }

      const tuningChanged =
        storedVehicle.tuning.damage.durability !== vehicle.tuning.damage.durability ||
        storedVehicle.tuning.damage.impactSpeedThreshold !== vehicle.tuning.damage.impactSpeedThreshold;

      storedVehicle.tuning = vehicle.tuning;

      if (tuningChanged) {
        storedVehicle.damageState = syncedDamageState;
      }
    });
  };

  return {
    getVehicleDamage: (vehicleId) => {
      const vehicle = vehicles.get(vehicleId);

      return vehicle ? createVehicleDamageSnapshot(vehicle.damageState) : null;
    },
    update: ({ currentTimeSeconds, impacts, vehicles: runtimeVehicles }) => {
      syncVehicles(runtimeVehicles);

      return impacts.flatMap((impact) => {
        const vehicle = vehicles.get(impact.targetVehicleId);

        if (!vehicle) {
          return [];
        }

        const damageDelta = impact.impactSpeed - vehicle.tuning.damage.impactSpeedThreshold;

        if (damageDelta <= 0) {
          return [];
        }

        const impactKey = createImpactKey(impact);
        const previousContactTime = recentContacts.get(impactKey) ?? Number.NEGATIVE_INFINITY;

        if (currentTimeSeconds - previousContactTime < CONTACT_COOLDOWN_SECONDS) {
          return [];
        }

        recentContacts.set(impactKey, currentTimeSeconds);
        vehicle.damageState = createVehicleDamageState({
          accumulatedDamage: vehicle.damageState.accumulatedDamage + damageDelta,
          tuning: vehicle.tuning
        });

        return [
          {
            damageDelta,
            damageState: createVehicleDamageSnapshot(vehicle.damageState),
            impactSpeed: impact.impactSpeed,
            sourceId: impact.sourceId,
            sourceType: impact.sourceType,
            targetVehicleId: impact.targetVehicleId,
            type: "vehicle.damaged"
          }
        ];
      });
    }
  };
}
