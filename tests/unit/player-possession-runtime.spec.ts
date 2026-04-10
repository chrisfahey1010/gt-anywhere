import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayerPossessionRuntime } from "../../src/sandbox/on-foot/player-possession-runtime";
import type { PlayerInputFrame } from "../../src/vehicles/controllers/player-vehicle-controller";

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

    const update = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(update.transition).toBe("none");
    expect(update.combatEnabled).toBe(false);
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

    const exitUpdate = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(exitUpdate.transition).toBe("exited");
    expect(exitUpdate.combatEnabled).toBe(false);

    runtime.bindActiveVehicle(otherVehicle);
    runtime.getOnFootRuntime()!.mesh.position.copyFromFloats(6.1, runtime.getOnFootRuntime()!.mesh.position.y, 0);

    const update = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(update.transition).toBe("none");
    expect(update.combatEnabled).toBe(true);
    expect(runtime.getMode()).toBe("on-foot");
    expect(runtime.getStoredVehicle()).toBe(exitedVehicle);
    runtime.dispose();
  });

  it("keeps exact re-entry deterministic when another hijackable vehicle is also nearby", () => {
    const ground = createGround();
    const storedVehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), Vector3.Zero());
    const hijackableVehicle = createVehicle("hijackable-vehicle", new Vector3(1.6, 1.7, 1.2), Vector3.Zero());
    const runtime = createPlayerPossessionRuntime({
      blockingMeshes: [],
      getInteractableVehicles: () => [hijackableVehicle],
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
    runtime.bindActiveVehicle(storedVehicle);

    expect(runtime.update(createFrame({ interactionRequested: true }), 1 / 60).transition).toBe("exited");

    runtime.getOnFootRuntime()?.mesh.position.copyFromFloats(0, runtime.getOnFootRuntime()!.mesh.position.y, -1.6);

    const update = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(update.transition).toBe("reentered");
    expect(update.combatEnabled).toBe(false);
    expect(runtime.getMode()).toBe("vehicle");
    expect(runtime.getStoredVehicle()).toBeNull();
    runtime.dispose();
  });

  it("starts a short hijack handoff and only transfers after the timer completes", () => {
    const ground = createGround();
    const storedVehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), Vector3.Zero());
    const hijackableVehicle = createVehicle("hijackable-vehicle", new Vector3(0, 1.7, 2.6), Vector3.Zero());
    const runtime = createPlayerPossessionRuntime({
      blockingMeshes: [],
      getInteractableVehicles: () => [hijackableVehicle],
      hijackDurationSeconds: 0.5,
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
    runtime.bindActiveVehicle(storedVehicle);

    expect(runtime.update(createFrame({ interactionRequested: true }), 1 / 60).transition).toBe("exited");

    runtime.getOnFootRuntime()?.mesh.position.copyFromFloats(0.8, runtime.getOnFootRuntime()!.mesh.position.y, 1.4);

    const startedHijack = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);

    expect(startedHijack.transition).toBe("hijack-started");
    expect(startedHijack.combatEnabled).toBe(false);
    expect(runtime.getMode()).toBe("on-foot");
    expect(runtime.getStoredVehicle()).toBe(storedVehicle);

    const hijackInFlight = runtime.update(createFrame({ interactionRequested: true }), 0.2);

    expect(hijackInFlight.transition).toBe("none");
    expect(hijackInFlight.combatEnabled).toBe(false);

    const completedHijack = runtime.update(createFrame(), 0.31);

    expect(completedHijack.transition).toBe("hijacked");
    expect(completedHijack.combatEnabled).toBe(false);
    expect(completedHijack.targetVehicle).toBe(hijackableVehicle);
    expect(runtime.getMode()).toBe("vehicle");
    expect(runtime.getOnFootRuntime()).toBeNull();
    expect(runtime.getStoredVehicle()).toBeNull();
    runtime.dispose();
  });

  it("only enables combat after the exit frame has completed", () => {
    const ground = createGround();
    const vehicle = createVehicle("starter-vehicle", new Vector3(0, 1.7, 0), Vector3.Zero());
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

    const exitUpdate = runtime.update(createFrame({ interactionRequested: true }), 1 / 60);
    const onFootUpdate = runtime.update(
      createFrame({
        onFootMovement: {
          forward: 1,
          right: 0
        }
      }),
      1 / 60
    );

    expect(exitUpdate.combatEnabled).toBe(false);
    expect(onFootUpdate.transition).toBe("none");
    expect(onFootUpdate.combatEnabled).toBe(true);
    runtime.dispose();
  });
});
