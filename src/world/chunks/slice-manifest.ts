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
  spawnCandidates: SpawnCandidate[];
  sceneMetadata: SliceSceneMetadata;
  traffic?: SliceTrafficPlan;
}
