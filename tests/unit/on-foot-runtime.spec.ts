import { Scene, TransformNode } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOnFootRuntime } from "../../src/sandbox/on-foot/on-foot-runtime";

describe("on-foot runtime", () => {
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

  it("moves relative to facing yaw with lightweight movement only", () => {
    const runtime = createOnFootRuntime({
      parent: root,
      scene,
      startPosition: { x: 0, y: 0.25, z: 0 }
    });

    runtime.update({
      deltaSeconds: 1,
      facingYaw: 0,
      movement: {
        forward: 1,
        right: 0
      },
      sliceBounds: {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
      }
    });

    expect(runtime.mesh.position.z).toBeGreaterThan(0);

    runtime.update({
      deltaSeconds: 1,
      facingYaw: Math.PI / 2,
      movement: {
        forward: 1,
        right: 0
      },
      sliceBounds: {
        minX: -20,
        maxX: 20,
        minZ: -20,
        maxZ: 20
      }
    });

    expect(runtime.mesh.position.x).toBeGreaterThan(0);
    runtime.dispose();
  });

  it("clamps movement to the active slice bounds", () => {
    const runtime = createOnFootRuntime({
      parent: root,
      scene,
      startPosition: { x: 0.9, y: 0.25, z: 0.9 }
    });

    runtime.update({
      deltaSeconds: 1,
      facingYaw: 0,
      movement: {
        forward: 1,
        right: 1
      },
      sliceBounds: {
        minX: -1,
        maxX: 1,
        minZ: -1,
        maxZ: 1
      }
    });

    expect(runtime.mesh.position.x).toBeLessThanOrEqual(1);
    expect(runtime.mesh.position.z).toBeLessThanOrEqual(1);
    runtime.dispose();
  });
});
