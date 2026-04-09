export interface VehicleInteractionPolicyRuntime {
  mesh: {
    metadata?: {
      interactionRole?: unknown;
    };
  };
}

export function isVehicleHijackInteractionAllowed(vehicle: VehicleInteractionPolicyRuntime): boolean {
  return vehicle.mesh.metadata?.interactionRole === "hijackable";
}
