import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";

describe("player possession runtime", () => {
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

  function createGround() {
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

    return ground;
  }

  function createVehicle(name: string, position: Vector3, velocity: Vector3) {
    const mesh = MeshBuilder.CreateBox(
      name,
      {
        width: 2,
        height: 1.6,
        depth: 4.5
      },
      scene
    );
    mesh.parent = root;
    mesh.position.copyFrom(position);
    let linearVelocity = velocity.clone();

    return {
      mesh,
      physicsAggregate: {
        body: {
          getLinearVelocity: () => linearVelocity.clone(),
          setAngularVelocity: vi.fn(),
          setLinearVelocity: vi.fn((value: Vector3) => {
            linearVelocity.copyFrom(value);
          })
        }
      }
    };
  }

  it("denies exit when the vehicle is above the safe speed threshold", () => {
    const ground = createGround();
    const vehicle = createVehicle("fast-vehicle", new Vector3(0, 1.7, 0), new Vector3(4, 0, 0));
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
    runtime.bindActiveVehicle(vehicle);

    const update = runtime.update(
      {
        interactionRequested: true,
        onFootMovement: { forward: 0, right: 0 },
        switchVehicleRequested: false,
        vehicleControls: {
          throttle: 0,
          brake: 0,
          steering: 0,
          handbrake: false,
          lookX: 0,
          lookY: 0,
          lookInputSource: "none"
        }
      },
      1 / 60
    );

    expect(update.transition).toBe("none");
    expect(runtime.getMode()).toBe("vehicle");
    expect(runtime.getOnFootRuntime()).toBeNull();
    runtime.dispose();
  });

  it("only allows re-entry against the exact stored vehicle runtime from exit time", () => {
    const ground = createGround();
    const exitedVehicle = createVehicle("stored-vehicle", new Vector3(0, 1.7, 0), Vector3.Zero());
    const otherVehicle = createVehicle("other-vehicle", new Vector3(6, 1.7, 0), Vector3.Zero());
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
    runtime.bindActiveVehicle(exitedVehicle);

    expect(
      runtime.update(
        {
          interactionRequested: true,
          onFootMovement: { forward: 0, right: 0 },
          switchVehicleRequested: false,
          vehicleControls: {
            throttle: 0,
            brake: 0,
            steering: 0,
            handbrake: false,
            lookX: 0,
            lookY: 0,
            lookInputSource: "none"
          }
        },
        1 / 60
      ).transition
    ).toBe("exited");

    runtime.bindActiveVehicle(otherVehicle);
    runtime.getOnFootRuntime()!.mesh.position.copyFromFloats(6.1, runtime.getOnFootRuntime()!.mesh.position.y, 0);

    const update = runtime.update(
      {
        interactionRequested: true,
        onFootMovement: { forward: 0, right: 0 },
        switchVehicleRequested: false,
        vehicleControls: {
          throttle: 0,
          brake: 0,
          steering: 0,
          handbrake: false,
          lookX: 0,
          lookY: 0,
          lookInputSource: "none"
        }
      },
      1 / 60
    );

    expect(update.transition).toBe("none");
    expect(runtime.getMode()).toBe("on-foot");
    expect(runtime.getStoredVehicle()).toBe(exitedVehicle);
    runtime.dispose();
  });
});
