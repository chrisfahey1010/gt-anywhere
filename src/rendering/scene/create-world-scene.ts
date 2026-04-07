import HavokPhysics from "@babylonjs/havok";
import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HavokPlugin,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import type { SpawnCandidate, SliceManifest, SliceRoad, SliceVector3 } from "../../world/chunks/slice-manifest";

export interface WorldSceneHandle {
  canvas: HTMLCanvasElement;
  dispose(): void;
}

export interface CreateWorldSceneOptions {
  renderHost: HTMLElement;
  manifest: SliceManifest;
  spawnCandidate: SpawnCandidate;
}

export interface WorldSceneLoader {
  load(options: CreateWorldSceneOptions): Promise<WorldSceneHandle>;
}

function toVector3(point: SliceVector3, yOffset = 0): Vector3 {
  return new Vector3(point.x, point.y + yOffset, point.z);
}

function buildRoadSegments(
  scene: Scene,
  parent: TransformNode,
  road: SliceRoad,
  material: StandardMaterial
): AbstractMesh[] {
  const segments: AbstractMesh[] = [];

  for (let index = 0; index < road.points.length - 1; index += 1) {
    const start = road.points[index];
    const end = road.points[index + 1];

    if (!start || !end) {
      continue;
    }

    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const length = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    const midpoint = new Vector3((start.x + end.x) / 2, 0.45, (start.z + end.z) / 2);
    const segment = MeshBuilder.CreateBox(
      `${road.id}-segment-${index}`,
      {
        width: road.width,
        height: 0.9,
        depth: length
      },
      scene
    );

    segment.position = midpoint;
    segment.rotation.y = Math.atan2(deltaX, deltaZ);
    segment.parent = parent;
    segment.material = material;
    segment.checkCollisions = true;
    segments.push(segment);
  }

  return segments;
}

function buildChunkMassing(
  scene: Scene,
  parent: TransformNode,
  manifest: SliceManifest,
  chunkIndex: number
): AbstractMesh[] {
  const chunk = manifest.chunks[chunkIndex];
  const buildings: AbstractMesh[] = [];

  if (!chunk) {
    return buildings;
  }

  const material = new StandardMaterial(`chunk-massing-material-${chunk.id}`, scene);
  material.diffuseColor = Color3.FromHexString("#52616b");

  for (let buildingIndex = 0; buildingIndex < 3; buildingIndex += 1) {
    const width = 20 + buildingIndex * 10;
    const depth = 18 + buildingIndex * 8;
    const height = 24 + buildingIndex * 14 + chunkIndex * 4;
    const building = MeshBuilder.CreateBox(
      `${chunk.id}-building-${buildingIndex}`,
      {
        width,
        depth,
        height
      },
      scene
    );

    building.position = new Vector3(
      chunk.origin.x + 36 + buildingIndex * 38,
      height / 2,
      chunk.origin.z + 46 + (chunkIndex % 2) * 48
    );
    building.parent = parent;
    building.material = material;
    buildings.push(building);
  }

  return buildings;
}

async function enableStaticPhysics(scene: Scene, meshes: AbstractMesh[]): Promise<PhysicsAggregate[]> {
  const havok = await HavokPhysics();
  const plugin = new HavokPlugin(true, havok);

  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);

  return meshes.map(
    (mesh) =>
      new PhysicsAggregate(
        mesh,
        PhysicsShapeType.BOX,
        {
          mass: 0,
          friction: 1,
          restitution: 0
        },
        scene
      )
  );
}

export class BabylonWorldSceneLoader implements WorldSceneLoader {
  async load(options: CreateWorldSceneOptions): Promise<WorldSceneHandle> {
    const { renderHost, manifest, spawnCandidate } = options;
    const canvas = document.createElement("canvas");
    canvas.className = "world-canvas";
    canvas.setAttribute("aria-label", `${manifest.location.placeName} world view`);
    renderHost.replaceChildren(canvas);

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString("#a7d8ff");

    const worldRoot = new TransformNode("world-root", scene);
    const staticSurfaceRoot = new TransformNode("static-surface-root", scene);
    staticSurfaceRoot.parent = worldRoot;

    const center = new Vector3(
      (manifest.bounds.minX + manifest.bounds.maxX) / 2,
      0,
      (manifest.bounds.minZ + manifest.bounds.maxZ) / 2
    );
    const width = manifest.bounds.maxX - manifest.bounds.minX;
    const depth = manifest.bounds.maxZ - manifest.bounds.minZ;

    const camera = new ArcRotateCamera(
      "slice-camera",
      -Math.PI / 2.6,
      Math.PI / 3.2,
      Math.max(width, depth) * 1.2,
      center,
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = Math.max(width, depth) * 0.45;
    camera.upperRadiusLimit = Math.max(width, depth) * 1.8;

    const light = new HemisphericLight("slice-light", new Vector3(0.1, 1, 0.1), scene);
    light.intensity = 0.95;

    const groundMaterial = new StandardMaterial("slice-ground-material", scene);
    groundMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.groundColor);

    const roadMaterial = new StandardMaterial("slice-road-material", scene);
    roadMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.roadColor);

    const boundaryMaterial = new StandardMaterial("slice-boundary-material", scene);
    boundaryMaterial.diffuseColor = Color3.FromHexString(manifest.sceneMetadata.boundaryColor);
    boundaryMaterial.alpha = 0.3;

    const ground = MeshBuilder.CreateGround(
      "slice-ground",
      {
        width,
        height: depth,
        subdivisions: 2
      },
      scene
    );
    ground.position = center;
    ground.parent = staticSurfaceRoot;
    ground.material = groundMaterial;
    ground.checkCollisions = true;

    const boundary = MeshBuilder.CreateBox(
      "slice-boundary",
      {
        width,
        depth,
        height: 2
      },
      scene
    );
    boundary.position = new Vector3(center.x, 1, center.z);
    boundary.parent = staticSurfaceRoot;
    boundary.material = boundaryMaterial;

    const staticPhysicsMeshes: AbstractMesh[] = [ground, boundary];

    const chunkRoots = manifest.chunks.map((chunk, chunkIndex) => {
      const chunkRoot = new TransformNode(`chunk-root-${chunk.id}`, scene);
      chunkRoot.parent = worldRoot;

      const chunkFloor = MeshBuilder.CreateGround(
        `${chunk.id}-ground`,
        {
          width: chunk.size.width - 8,
          height: chunk.size.depth - 8
        },
        scene
      );
      chunkFloor.position = new Vector3(
        chunk.origin.x + chunk.size.width / 2,
        0.02,
        chunk.origin.z + chunk.size.depth / 2
      );
      chunkFloor.parent = chunkRoot;
      chunkFloor.material = groundMaterial;
      staticPhysicsMeshes.push(chunkFloor);

      manifest.roads
        .filter((road) => chunk.roadIds.includes(road.id))
        .forEach((road) => {
          staticPhysicsMeshes.push(...buildRoadSegments(scene, chunkRoot, road, roadMaterial));
        });

      staticPhysicsMeshes.push(...buildChunkMassing(scene, chunkRoot, manifest, chunkIndex));

      return chunkRoot;
    });

    const physicsAggregates = await enableStaticPhysics(scene, staticPhysicsMeshes);

    const spawnMarkerMaterial = new StandardMaterial("spawn-marker-material", scene);
    spawnMarkerMaterial.diffuseColor = new Color3(1, 0.85, 0.45);
    const spawnMarker = MeshBuilder.CreateCylinder(
      "spawn-marker",
      { height: 6, diameter: 4 },
      scene
    );
    spawnMarker.position = toVector3(spawnCandidate.position, 3);
    spawnMarker.parent = worldRoot;
    spawnMarker.material = spawnMarkerMaterial;

    scene.metadata = {
      sliceId: manifest.sliceId,
      worldRootName: worldRoot.name,
      staticSurfaceRootName: staticSurfaceRoot.name,
      chunkRootNames: chunkRoots.map((chunkRoot) => chunkRoot.name),
      physicsReady: scene.isPhysicsEnabled()
    };

    const resize = (): void => {
      engine.resize();
    };

    window.addEventListener("resize", resize);
    engine.runRenderLoop(() => {
      scene.render();
    });

    return {
      canvas,
      dispose: () => {
        window.removeEventListener("resize", resize);
        physicsAggregates.forEach((aggregate) => aggregate.dispose());
        scene.dispose();
        engine.dispose();
        canvas.remove();
      }
    };
  }
}
