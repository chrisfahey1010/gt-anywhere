import {
  HEAT_RESPONDER_DIRECT_CONTACT_DISTANCE,
  HEAT_RESPONDER_SPAWN_OFFSET_DISTANCE,
  HEAT_RESPONDER_SPACING_DISTANCE,
  HEAT_RESPONDER_TARGET_OFFSET_DISTANCE
} from "./heat-pursuit-config";
import type { HeatPursuitContact, HeatRuntimeSnapshot } from "./heat-runtime";

export interface EvaluateResponderContactOptions {
  directContactEstablished: boolean;
  heatSnapshot: Pick<HeatRuntimeSnapshot, "pursuitPhase" | "responderCount">;
  nearestResponderDistance: number | null;
}

export interface EvaluateResponderContactResult {
  contact: HeatPursuitContact;
  directContactEstablished: boolean;
}

export function getResponderSpawnDistance(index: number): number {
  return HEAT_RESPONDER_SPAWN_OFFSET_DISTANCE + index * HEAT_RESPONDER_SPACING_DISTANCE;
}

export function getResponderTargetDistance(index: number): number {
  return HEAT_RESPONDER_TARGET_OFFSET_DISTANCE + index * HEAT_RESPONDER_SPACING_DISTANCE;
}

export function evaluateResponderContact(options: EvaluateResponderContactOptions): EvaluateResponderContactResult {
  if (options.heatSnapshot.pursuitPhase === "none" || options.heatSnapshot.responderCount <= 0) {
    return {
      contact: "unknown",
      directContactEstablished: false
    };
  }

  if (
    options.nearestResponderDistance !== null &&
    options.nearestResponderDistance <= HEAT_RESPONDER_DIRECT_CONTACT_DISTANCE
  ) {
    return {
      contact: "direct",
      directContactEstablished: true
    };
  }

  if (options.directContactEstablished) {
    return {
      contact: "broken",
      directContactEstablished: true
    };
  }

  return {
    contact: "unknown",
    directContactEstablished: false
  };
}
