import { MeshBuilder, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSafeExitPosition } from "../../src/sandbox/on-foot/exit-placement";

describe("safe exit placement", () => {
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

  function createVehicle() {
    const vehicle = MeshBuilder.CreateBox(
      "vehicle",
      {
        width: 2,
        height: 1.6,
        depth: 4.5
      },
      scene
    );
    vehicle.parent = root;
    vehicle.position.copyFromFloats(0, 1.7, 0);

    return vehicle;
  }

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

  function createBlocker(name: string, position: Vector3) {
    const blocker = MeshBuilder.CreateBox(
      name,
      {
        width: 1.2,
        height: 2.2,
        depth: 1.2
      },
      scene
    );
    blocker.parent = root;
    blocker.position.copyFrom(position);

    return blocker;
  }

  it("prefers the driver-side exit when it is clear", () => {
    const vehicle = createVehicle();
    const ground = createGround();

    const result = findSafeExitPosition({
      blockingMeshes: [],
      sliceBounds: {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
      },
      surfaceMeshes: [ground],
      vehicleMesh: vehicle
    });

    expect(result?.anchor).toBe("driver-side");
    expect(result?.position.x ?? 0).toBeLessThan(vehicle.position.x);
  });

  it("falls back from driver side to passenger side to rear when earlier exits are blocked", () => {
    const vehicle = createVehicle();
    const ground = createGround();

    const result = findSafeExitPosition({
      blockingMeshes: [
        createBlocker("driver-blocker", new Vector3(-1.6, 1.35, 0)),
        createBlocker("passenger-blocker", new Vector3(1.6, 1.35, 0))
      ],
      sliceBounds: {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
      },
      surfaceMeshes: [ground],
      vehicleMesh: vehicle
    });

    expect(result?.anchor).toBe("rear");
    expect(result?.position.z ?? 0).toBeLessThan(vehicle.position.z);
  });

  it("fails closed when every fallback is blocked or out of bounds", () => {
    const vehicle = createVehicle();
    const ground = createGround();

    const result = findSafeExitPosition({
      blockingMeshes: [
        createBlocker("driver-blocker", new Vector3(-1.6, 1.35, 0)),
        createBlocker("passenger-blocker", new Vector3(1.6, 1.35, 0)),
        createBlocker("rear-blocker", new Vector3(0, 1.35, -2.8))
      ],
      sliceBounds: {
        minX: -1,
        maxX: 1,
        minZ: -1,
        maxZ: 1
      },
      surfaceMeshes: [ground],
      vehicleMesh: vehicle
    });

    expect(result).toBeNull();
  });
});
