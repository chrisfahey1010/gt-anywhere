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
  kind: SliceRoadKind;
  width: number;
  points: SliceVector3[];
}

export interface SpawnCandidate {
  id: string;
  chunkId: string;
  position: SliceVector3;
  headingDegrees: number;
}

export interface SliceSceneMetadata {
  displayName: string;
  districtName: string;
  roadColor: string;
  groundColor: string;
  boundaryColor: string;
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
}
