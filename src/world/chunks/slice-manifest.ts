export interface SliceVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SliceBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface SliceChunk {
  id: string;
  origin: SliceVector3;
  size: {
    width: number;
    depth: number;
  };
  roadIds: string[];
}

export type SliceRoadKind = "primary" | "secondary" | "tertiary";

export interface SliceRoad {
  id: string;
  displayName?: string;
  kind: SliceRoadKind;
  width: number;
  points: SliceVector3[];
}

export interface SliceDistrict {
  id: string;
  displayName: string;
  bounds: SliceBounds;
  anchorRoadIds: string[];
}

export type SliceWorldEntryKind = "building-massing" | "landmark";

export interface SliceWorldEntryMetadata {
  displayName: string;
  source: "preset" | "derived";
}

export interface SliceWorldEntry {
  id: string;
  chunkId: string;
  districtId: string;
  kind: SliceWorldEntryKind;
  assetId?: string;
  position: SliceVector3;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  yawDegrees?: number;
  relatedChunkIds?: string[];
  metadata: SliceWorldEntryMetadata;
}

export interface SpawnCandidate {
  id: string;
  chunkId: string;
  roadId: string;
  position: SliceVector3;
  headingDegrees: number;
  surface: "road" | "shoulder";
  laneIndex: number;
  starterVehicle: {
    kind: "starter-car";
    placement: "lane-center";
    dimensions: {
      width: number;
      height: number;
      length: number;
    };
  };
}

export interface SliceSceneMetadata {
  displayName: string;
  districtName: string;
  roadColor: string;
  groundColor: string;
  boundaryColor: string;
  palette?: SliceSceneVisualPaletteOverrides;
}

export interface SliceSceneVisualPaletteOverrides {
  chunkColor?: string;
  hazeColor?: string;
  pedestrianColor?: string;
  skyColor?: string;
  vehicleAccentColor?: string;
  propColors?: Partial<Record<BreakablePropType, string>>;
}

export interface SliceSceneVisualPalette {
  boundaryColor: string;
  chunkColor: string;
  groundColor: string;
  hazeColor: string;
  pedestrianColor: string;
  propColors: Record<BreakablePropType, string>;
  roadColor: string;
  skyColor: string;
  vehicleAccentColor: string;
}

export type TrafficVehicleDirection = "forward" | "reverse";

export type TrafficVehicleType = "sedan" | "sports-car" | "heavy-truck";

export interface TrafficVehiclePlan {
  id: string;
  chunkId: string;
  roadId: string;
  position: SliceVector3;
  headingDegrees: number;
  direction: TrafficVehicleDirection;
  startDistance: number;
  speedScale: number;
  vehicleType: TrafficVehicleType;
}

export interface SliceTrafficPlan {
  vehicles: TrafficVehiclePlan[];
}

export type PedestrianInitialState = "standing" | "walking" | "waiting";

export interface PedestrianPlanEntry {
  id: string;
  chunkId: string;
  roadId: string;
  position: SliceVector3;
  headingDegrees: number;
  startDistance: number;
  offsetFromRoad: number;
  initialState: PedestrianInitialState;
}

export interface SlicePedestrianPlan {
  pedestrians: PedestrianPlanEntry[];
}

export type BreakablePropType = "barrier" | "bollard" | "hydrant" | "short-post" | "signpost";

export interface BreakablePropPlanEntry {
  id: string;
  chunkId: string;
  roadId: string;
  propType: BreakablePropType;
  position: SliceVector3;
  headingDegrees: number;
  startDistance: number;
}

export interface SliceBreakablePropPlan {
  props: BreakablePropPlanEntry[];
}

export interface SliceManifest {
  sliceId: string;
  generationVersion: string;
  location: {
    placeName: string;
    reuseKey: string;
    sessionKey: string;
  };
  seed: string;
  bounds: SliceBounds;
  chunks: SliceChunk[];
  roads: SliceRoad[];
  districts: SliceDistrict[];
  worldEntries: SliceWorldEntry[];
  spawnCandidates: SpawnCandidate[];
  sceneMetadata: SliceSceneMetadata;
  traffic?: SliceTrafficPlan;
  pedestrians?: SlicePedestrianPlan;
  breakableProps?: SliceBreakablePropPlan;
}
