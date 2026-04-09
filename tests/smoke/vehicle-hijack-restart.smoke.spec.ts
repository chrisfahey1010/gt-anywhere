import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorldNavigationSnapshot, syncWorldSceneTelemetry } from "../../src/rendering/scene/world-scene-runtime";
import { createOnFootCamera } from "../../src/sandbox/on-foot/create-on-foot-camera";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import {
  createPlayerVehicleController,
  type PlayerInputFrame,
  type VehicleControlState
} from "../../src/vehicles/controllers/player-vehicle-controller";
import {
  createManagedVehicleRuntime,
  createVehicleManager,
  type ManagedVehicleRuntime
} from "../../src/vehicles/physics/vehicle-manager";
import type { VehicleTuning } from "../../src/vehicles/physics/vehicle-factory";

function createTuning(vehicleType: ManagedVehicleRuntime["vehicleType"]): VehicleTuning {
  return {
    color: vehicleType === "sports-car" ? "#ff0000" : "#f25f5c",
    dimensions: {
      height: 1.4,
      length: 4.5,
      width: 1.8
    },
    mass: 1200,
    maxForwardSpeed: 18,
    maxReverseSpeed: 7,
    maxTurnRate: 1.8,
    damage: {
      durability: vehicleType === "sports-car" ? 60 : 100,
      impactSpeedThreshold: vehicleType === "sports-car" ? 8 : 7
    },
    model: {
      bodyStyle: vehicleType === "sports-car" ? "sports-car" : "sedan"
    },
    name: vehicleType === "sports-car" ? "Sports Car" : "Sedan"
  };
}

describe("vehicle hijack restart smoke", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    scene.dispose();
    root.dispose();
    engine.dispose();
  });

  it("clears hijack state on restart-style recreation while keeping telemetry coherent", () => {
    const createSession = (canvas: HTMLCanvasElement) => {
      const ground = MeshBuilder.CreateBox(
        `ground-${canvas.dataset.session ?? "0"}`,
        {
          width: 40,
          height: 0.5,
          depth: 40
        },
        scene
      );
      ground.parent = root;
      ground.position.y = 0.25;

      const createRuntime = (
        name: string,
        vehicleType: ManagedVehicleRuntime["vehicleType"],
        position: Vector3
      ): ManagedVehicleRuntime => {
        const mesh = MeshBuilder.CreateBox(name, { width: 2, height: 1.6, depth: 4.5 }, scene);
        mesh.parent = root;
        mesh.position.copyFrom(position);
        const linearVelocity = Vector3.Zero();

        return createManagedVehicleRuntime({
          vehicleType,
          tuning: createTuning(vehicleType),
          runtime: {
            mesh,
            physicsAggregate: {
              body: {
                getAngularVelocity: () => Vector3.Zero(),
                getLinearVelocity: () => linearVelocity.clone(),
                setAngularVelocity: vi.fn(),
                setLinearVelocity: vi.fn((value: Vector3) => {
                  linearVelocity.copyFrom(value);
                })
              }
            } as unknown as ManagedVehicleRuntime["physicsAggregate"],
            update: (_controls?: VehicleControlState) => {},
            dispose: vi.fn()
          }
        });
      };

      const starterVehicle = createRuntime("starter-vehicle-spawn-0", "sedan", new Vector3(0, 1.7, 0));
      const hijackableVehicle = createRuntime(
        "hijackable-vehicle-market-st-secondary-0-1",
        "sports-car",
        new Vector3(0, 1.7, 2.6)
      );
      const manager = createVehicleManager({
        activeVehicle: starterVehicle,
        availableVehicleTypes: ["sedan", "sports-car"],
        loadTuningProfile: vi.fn(async (vehicleType: string) => createTuning(vehicleType)),
        spawnVehicle: vi.fn(({ vehicleType, tuning }: { vehicleType: string; tuning: VehicleTuning }) =>
          createManagedVehicleRuntime({
            vehicleType,
            tuning,
            runtime: {
              mesh: MeshBuilder.CreateBox(`spawned-${vehicleType}`, { size: 1 }, scene),
              physicsAggregate: {
                body: {
                  getAngularVelocity: () => Vector3.Zero(),
                  getLinearVelocity: () => Vector3.Zero(),
                  setAngularVelocity: () => {},
                  setLinearVelocity: () => {}
                }
              } as unknown as ManagedVehicleRuntime["physicsAggregate"],
              update: () => {},
              dispose: vi.fn()
            }
          })
        )
      });
      let hijackableVehicles: ManagedVehicleRuntime[] = [hijackableVehicle];
      const controller = createPlayerVehicleController({ eventTarget: window });
      const possessionRuntime = createPlayerPossessionRuntime({
        blockingMeshes: [],
        getInteractableVehicles: () => hijackableVehicles,
        hijackDurationSeconds: 0.25,
        parent: root,
        scene,
        sliceBounds: {
          minX: -20,
          maxX: 20,
          minZ: -20,
          maxZ: 20
        },
        surfaceMeshes: [ground]
      });
      possessionRuntime.bindActiveVehicle(manager.getActiveVehicle());
      controller.bindVehicle(starterVehicle.mesh);

      let currentInputFrame: PlayerInputFrame = controller.captureInputFrame();
      const vehicleCamera = createStarterVehicleCamera({
        scene,
        target: starterVehicle.mesh,
        controller,
        getInputState: () => currentInputFrame.vehicleControls
      });
      const spawnPoint = starterVehicle.mesh.position.clone();
      let onFootCamera = null as ReturnType<typeof createOnFootCamera> | null;
      let previousActorId: string | undefined;
      let previousRoadId: string | undefined;
      scene.metadata = {};

      const readNavigationSnapshot = () => {
        const result = createWorldNavigationSnapshot({
          activeVehicle: manager.getActiveVehicle(),
          manifest: {
            bounds: {
              minX: -20,
              maxX: 20,
              minZ: -20,
              maxZ: 20
            },
            roads: [
              {
                id: "market-st",
                displayName: "Market Street",
                kind: "primary",
                width: 18,
                points: [
                  { x: -18, y: 0, z: 0 },
                  { x: 18, y: 0, z: 0 }
                ]
              },
              {
                id: "mission-st",
                displayName: "Mission Street",
                kind: "secondary",
                width: 14,
                points: [
                  { x: -18, y: 0, z: 2.6 },
                  { x: 18, y: 0, z: 2.6 }
                ]
              }
            ],
            sceneMetadata: {
              displayName: "San Francisco, CA",
              districtName: "Downtown"
            }
          },
          onFootActor: possessionRuntime.getOnFootRuntime(),
          onFootFacingYaw: possessionRuntime.getFacingYaw(),
          possessionMode: possessionRuntime.getMode(),
          previousActorId,
          previousRoadId
        });

        previousActorId = result.currentActorId;
        previousRoadId = result.currentRoadId ?? undefined;

        return result.snapshot;
      };

      const syncTelemetry = () => {
        syncWorldSceneTelemetry({
          activeVehicle: manager.getActiveVehicle(),
          canvas,
          fallbackCameraName: vehicleCamera.name,
          onFootActorId: possessionRuntime.getOnFootRuntime()?.mesh.name,
          possessionMode: possessionRuntime.getMode(),
          scene,
          spawnPoint
        });
      };

      const applyUpdate = (deltaSeconds: number) => {
        const update = possessionRuntime.update(currentInputFrame, deltaSeconds);

        if (update.transition === "exited") {
          controller.unbindVehicle();
          onFootCamera = createOnFootCamera({
            scene,
            target: possessionRuntime.getOnFootRuntime()!.mesh
          });
          onFootCamera.updateView(possessionRuntime.getFacingYaw(), possessionRuntime.getLookPitch());
        }

        if (update.transition === "hijacked" && update.targetVehicle) {
          const previousVehicle = manager.getActiveVehicle();
          const nextVehicle = update.targetVehicle as ManagedVehicleRuntime;

          hijackableVehicles = hijackableVehicles.filter((vehicle) => vehicle !== nextVehicle);
          hijackableVehicles.push(previousVehicle);
          manager.setActiveVehicle(nextVehicle);
          possessionRuntime.bindActiveVehicle(nextVehicle);
          controller.bindVehicle(nextVehicle.mesh);
          vehicleCamera.setVehicleTarget(nextVehicle.mesh);
          scene.activeCamera = vehicleCamera;
        }

        syncTelemetry();

        return update;
      };

      return {
        applyUpdate,
        canvas,
        controller,
        hijackableVehicle,
        possessionRuntime,
        readNavigationSnapshot,
        starterVehicle,
        syncTelemetry,
        updateInputFrame: () => {
          currentInputFrame = controller.captureInputFrame();
        }
      };
    };

    const initialCanvas = document.createElement("canvas");
    initialCanvas.dataset.session = "initial";
    const firstSession = createSession(initialCanvas);

    firstSession.syncTelemetry();
    expect(initialCanvas.dataset.possessionMode).toBe("vehicle");
    expect(initialCanvas.dataset.starterVehicleId).toBe(firstSession.starterVehicle.mesh.name);
    expect(firstSession.readNavigationSnapshot()).toMatchObject({
      actor: {
        possessionMode: "vehicle"
      },
      streetLabel: "Market Street"
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    firstSession.updateInputFrame();
    expect(firstSession.applyUpdate(1 / 60).transition).toBe("exited");

    firstSession.possessionRuntime.getOnFootRuntime()!.mesh.position.copyFromFloats(
      0.8,
      firstSession.possessionRuntime.getOnFootRuntime()!.mesh.position.y,
      1.4
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    firstSession.updateInputFrame();
    expect(firstSession.applyUpdate(1 / 60).transition).toBe("hijack-started");
    firstSession.updateInputFrame();
    expect(firstSession.applyUpdate(0.26).transition).toBe("hijacked");
    expect(initialCanvas.dataset.possessionMode).toBe("vehicle");
    expect(initialCanvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(initialCanvas.dataset.starterVehicleId).toBe(firstSession.hijackableVehicle.mesh.name);
    expect(initialCanvas.dataset.onFootActorId).toBe("");
    expect(firstSession.readNavigationSnapshot()).toMatchObject({
      actor: {
        possessionMode: "vehicle"
      },
      streetLabel: "Mission Street"
    });

    firstSession.possessionRuntime.dispose();
    firstSession.controller.dispose();

    const restartedCanvas = document.createElement("canvas");
    restartedCanvas.dataset.session = "restart";
    const restartedSession = createSession(restartedCanvas);

    restartedSession.syncTelemetry();

    expect(restartedCanvas.dataset.possessionMode).toBe("vehicle");
    expect(restartedCanvas.dataset.activeCamera).toBe("starter-vehicle-camera");
    expect(restartedCanvas.dataset.starterVehicleId).toBe(restartedSession.starterVehicle.mesh.name);
    expect(restartedCanvas.dataset.starterVehicleId).not.toBe(firstSession.hijackableVehicle.mesh.name);
    expect(restartedCanvas.dataset.onFootActorId).toBe("");
    expect(restartedSession.readNavigationSnapshot()).toMatchObject({
      actor: {
        possessionMode: "vehicle"
      },
      streetLabel: "Market Street"
    });

    restartedSession.possessionRuntime.dispose();
    restartedSession.controller.dispose();
  });
});
