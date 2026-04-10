import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerInputFrame } from "../../src/vehicles/controllers/player-vehicle-controller";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";

describe("player possession runtime integration", () => {
  let engine: NullEngine;
  let scene: Scene;
  let root: TransformNode;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
    root = new TransformNode("world-root", scene);
  });

  afterEach(() => {
    root.dispose();
    scene.dispose();
    engine.dispose();
  });

  function createFrame(overrides: Partial<PlayerInputFrame> = {}): PlayerInputFrame {
    return {
      combatControls: {
        firePressed: false,
        weaponCycleDirection: 0,
        weaponSlotRequested: null,
        ...overrides.combatControls
      },
      interactionRequested: false,
      onFootMovement: {
        forward: 0,
        right: 0,
        ...overrides.onFootMovement
      },
      switchVehicleRequested: false,
      vehicleControls: {
        throttle: 0,
        brake: 0,
        steering: 0,
        handbrake: false,
        lookX: 0,
        lookY: 0,
        lookInputSource: "none",
        ...overrides.vehicleControls
      },
      ...overrides
    };
  }

  it("exits to a lightweight on-foot runtime and re-enters the exact stored vehicle", () => {
    const ground = MeshBuilder.CreateBox(
      "ground",
      {
        width: 40,
        height: 0.5,
        depth: 40
      },
      scene
    );
    ground.parent = root;
    ground.position.y = 0.25;

    const vehicleMesh = MeshBuilder.CreateBox(
      "vehicle-runtime",
      {
        width: 2,
        height: 1.6,
        depth: 4.5
      },
      scene
    );
    vehicleMesh.parent = root;
    vehicleMesh.position.copyFromFloats(0, 1.7, 0);

    const linearVelocity = new Vector3(0.2, 0, 0.1);
    const angularVelocity = new Vector3(0, 0.1, 0);
    const vehicleRuntime = {
      mesh: vehicleMesh,
      physicsAggregate: {
        body: {
          getAngularVelocity: () => angularVelocity.clone(),
          getLinearVelocity: () => linearVelocity.clone(),
          setAngularVelocity: vi.fn((value: Vector3) => {
            angularVelocity.copyFrom(value);
          }),
          setLinearVelocity: vi.fn((value: Vector3) => {
            linearVelocity.copyFrom(value);
          })
        }
      }
    };

    const runtime = createPlayerPossessionRuntime({
      blockingMeshes: [],
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
    runtime.bindActiveVehicle(vehicleRuntime);

    const exitUpdate = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(exitUpdate.transition).toBe("exited");
    expect(runtime.getMode()).toBe("on-foot");
    expect(runtime.getOnFootRuntime()).not.toBeNull();
    expect(runtime.getStoredVehicle()).toBe(vehicleRuntime);
    expect(vehicleRuntime.physicsAggregate.body.setLinearVelocity).toHaveBeenCalled();
    expect(vehicleRuntime.physicsAggregate.body.setAngularVelocity).toHaveBeenCalled();

    const onFootRuntime = runtime.getOnFootRuntime();
    expect(onFootRuntime).not.toBeNull();
    const positionBeforeMove = onFootRuntime!.mesh.position.clone();

    runtime.update(
      createFrame({
        onFootMovement: {
          forward: 1,
          right: 0
        },
        vehicleControls: {
          throttle: 0,
          brake: 0,
          steering: 0,
          handbrake: false,
          lookX: 8,
          lookY: -2,
          lookInputSource: "mouse"
        }
      }),
      1 / 2
    );

    expect(runtime.getOnFootRuntime()?.mesh.position.z ?? 0).toBeGreaterThan(positionBeforeMove.z);

    runtime.getOnFootRuntime()?.mesh.position.copyFromFloats(0.5, runtime.getOnFootRuntime()!.mesh.position.y, -0.5);

    const reentryUpdate = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(reentryUpdate.transition).toBe("reentered");
    expect(runtime.getMode()).toBe("vehicle");
    expect(runtime.getOnFootRuntime()).toBeNull();
    expect(runtime.getStoredVehicle()).toBeNull();
    runtime.dispose();
  });
});
