import { MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { createGameApp } from "../../src/app/bootstrap/create-game-app";
import type { WorldSceneLoader } from "../../src/rendering/scene/create-world-scene";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import { createPlayerVehicleController } from "../../src/vehicles/controllers/player-vehicle-controller";
import type { SliceManifest, SpawnCandidate } from "../../src/world/chunks/slice-manifest";
import type { WorldSliceGenerator } from "../../src/world/generation/world-slice-generator";
import { validLocationAliasQuery } from "../fixtures/location-queries";

describe("starter vehicle camera integration", () => {
  const manifest: SliceManifest = {
    sliceId: "san-francisco-ca-story-1-4",
    generationVersion: "story-1-4",
    location: {
      placeName: "San Francisco, CA",
      reuseKey: "san-francisco-ca",
      sessionKey: "san-francisco-ca-story-1-1"
    },
    seed: "story-1-4",
    bounds: {
      minX: -400,
      maxX: 400,
      minZ: -400,
      maxZ: 400
    },
    chunks: [
      {
        id: "chunk-0-0",
        origin: { x: -400, y: 0, z: -400 },
        size: { width: 800, depth: 800 },
        roadIds: ["market-st"]
      }
    ],
    roads: [
      {
        id: "market-st",
        kind: "primary",
        width: 18,
        points: [
          { x: -280, y: 0, z: -220 },
          { x: 280, y: 0, z: 220 }
        ]
      }
    ],
    districts: [],
    worldEntries: [],
    spawnCandidates: [
      {
        id: "spawn-0",
        chunkId: "chunk-0-0",
        roadId: "market-st",
        position: { x: -20, y: 0, z: -20 },
        headingDegrees: 0,
        surface: "road",
        laneIndex: 0,
        starterVehicle: {
          kind: "starter-car",
          placement: "lane-center",
          dimensions: {
            width: 2.2,
            height: 1.6,
            length: 4.6
          }
        }
      }
    ],
    sceneMetadata: {
      displayName: "San Francisco, CA",
      districtName: "Downtown",
      roadColor: "#f6d365",
      groundColor: "#263238",
      boundaryColor: "#8ec5fc"
    }
  };

  function createWorldDependencies(results: {
    receivedSpawnCandidate: SpawnCandidate | null;
    cameraAttached: boolean;
    freeLookMoved: boolean;
    reverseCameraActive: boolean;
  }): {
    sliceGenerator: WorldSliceGenerator;
    sceneLoader: WorldSceneLoader;
  } {
    const sliceGenerator: WorldSliceGenerator = {
      generate: async () => ({
        ok: true,
        manifest,
        spawnCandidate: manifest.spawnCandidates[0]
      })
    };

    const sceneLoader: WorldSceneLoader = {
      load: async ({ renderHost, spawnCandidate }) => {
        results.receivedSpawnCandidate = spawnCandidate;
        renderHost.innerHTML = '<div data-testid="world-ready-scene">Camera world scene</div>';

        const engine = new NullEngine();
        const scene = new Scene(engine);
        const eventTarget = new EventTarget();
        const controller = createPlayerVehicleController({ eventTarget });
        const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
        const velocity = new Vector3(0, 0, 0);

        target.position.copyFromFloats(
          spawnCandidate.position.x,
          spawnCandidate.position.y,
          spawnCandidate.position.z
        );
        target.rotation.y = (spawnCandidate.headingDegrees * Math.PI) / 180;
        target.physicsBody = {
          getLinearVelocityToRef: (ref: Vector3) => {
            ref.copyFrom(velocity);
          },
          getLinearVelocity: () => velocity.clone(),
          dispose: () => {}
        } as any;
        controller.bindVehicle(target);

        const camera = createStarterVehicleCamera({ scene, target, controller });

        for (let frame = 0; frame < 10; frame += 1) {
          scene.render();
        }

        results.cameraAttached = scene.activeCamera === camera;
        const initialLookAt = camera.getTarget().clone();

        const mouseEvent = new MouseEvent("mousemove");
        Object.defineProperty(mouseEvent, "movementX", { value: 80 });
        Object.defineProperty(mouseEvent, "movementY", { value: 30 });
        eventTarget.dispatchEvent(mouseEvent);

        for (let frame = 0; frame < 5; frame += 1) {
          scene.render();
        }

        results.freeLookMoved = Vector3.Distance(initialLookAt, camera.getTarget()) > 0.25;

        velocity.set(0, 0, -6);
        for (let frame = 0; frame < 40; frame += 1) {
          scene.render();
        }

        results.reverseCameraActive =
          camera.position.z > target.position.z && camera.getTarget().z < target.position.z;

        return {
          canvas: document.createElement("canvas"),
          dispose: () => {
            controller.dispose();
            scene.dispose();
            engine.dispose();
            renderHost.innerHTML = "";
          }
        };
      }
    };

    return {
      sliceGenerator,
      sceneLoader
    };
  }

  it("attaches inside a loaded slice flow, respects free-look input, and transitions into reverse framing", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const host = document.querySelector("#app") as HTMLElement;
    const results = {
      receivedSpawnCandidate: null as SpawnCandidate | null,
      cameraAttached: false,
      freeLookMoved: false,
      reverseCameraActive: false
    };
    const { sliceGenerator, sceneLoader } = createWorldDependencies(results);
    const app = await createGameApp({
      host,
      sliceGenerator,
      sceneLoader,
      clock: () => "2026-04-07T00:00:00.000Z"
    });
    const input = host.querySelector('[data-testid="location-input"]') as HTMLInputElement;
    const form = host.querySelector("form") as HTMLFormElement;

    input.value = validLocationAliasQuery;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await app.whenIdle();

    expect(app.getSnapshot().phase).toBe("world-ready");
    expect(results.receivedSpawnCandidate?.id).toBe("spawn-0");
    expect(results.cameraAttached).toBe(true);
    expect(results.freeLookMoved).toBe(true);
    expect(results.reverseCameraActive).toBe(true);
  });
});
