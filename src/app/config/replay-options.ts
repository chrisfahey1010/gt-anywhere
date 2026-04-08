export const REPLAY_VEHICLE_TYPES = ["sedan", "sports-car", "heavy-truck"] as const;

export type ReplayStarterVehicleType = (typeof REPLAY_VEHICLE_TYPES)[number];

export type ReplaySelection = {
  id: string;
  kind: "vehicle" | "intention";
  label: string;
  prompt: string;
  starterVehicleType: ReplayStarterVehicleType;
};

export interface ReplayOption {
  selection: ReplaySelection;
}

export const REPLAY_VEHICLE_OPTIONS: readonly ReplayOption[] = [
  {
    selection: {
      id: "vehicle-sedan",
      kind: "vehicle",
      label: "Sedan",
      prompt: "Replay the current slice in the default starter sedan.",
      starterVehicleType: "sedan"
    }
  },
  {
    selection: {
      id: "vehicle-sports-car",
      kind: "vehicle",
      label: "Sports Car",
      prompt: "Replay the current slice with a faster sports car start.",
      starterVehicleType: "sports-car"
    }
  },
  {
    selection: {
      id: "vehicle-heavy-truck",
      kind: "vehicle",
      label: "Heavy Truck",
      prompt: "Replay the current slice from the same spawn in a heavy truck.",
      starterVehicleType: "heavy-truck"
    }
  }
];

export const REPLAY_INTENTION_OPTIONS: readonly ReplayOption[] = [
  {
    selection: {
      id: "intention-cruise",
      kind: "intention",
      label: "Cruise",
      prompt: "Take the same streets at an easy pace and stay in the flow.",
      starterVehicleType: "sedan"
    }
  },
  {
    selection: {
      id: "intention-precision",
      kind: "intention",
      label: "Precision",
      prompt: "Run the same slice with a tighter, more responsive starter car.",
      starterVehicleType: "sports-car"
    }
  },
  {
    selection: {
      id: "intention-chaos",
      kind: "intention",
      label: "Chaos",
      prompt: "Start big and loud in a heavy truck, then improvise from there.",
      starterVehicleType: "heavy-truck"
    }
  }
];

const ALL_REPLAY_OPTIONS = [...REPLAY_VEHICLE_OPTIONS, ...REPLAY_INTENTION_OPTIONS] as const;

export function getReplaySelectionById(id: string): ReplaySelection | null {
  const option = ALL_REPLAY_OPTIONS.find((candidate) => candidate.selection.id === id);

  return option ? { ...option.selection } : null;
}
