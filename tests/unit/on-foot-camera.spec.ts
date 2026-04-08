import { MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOnFootCamera } from "../../src/sandbox/on-foot/create-on-foot-camera";

describe("on-foot camera", () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it("follows the active on-foot actor with explicit yaw and pitch control", () => {
    const actor = MeshBuilder.CreateBox("on-foot-actor", { size: 1 }, scene);
    const camera = createOnFootCamera({ scene, target: actor });

    camera.updateView(Math.PI / 4, 0.2);
    scene.render();

    expect(scene.activeCamera).toBe(camera);
    expect(Vector3.Distance(camera.position, actor.position)).toBeGreaterThan(1.5);
    expect(Vector3.Distance(camera.getTarget(), actor.position)).toBeGreaterThan(1);
  });

  it("retargets to a replacement actor without reusing the vehicle chase camera", () => {
    const actor = MeshBuilder.CreateBox("on-foot-actor", { size: 1 }, scene);
    const replacement = MeshBuilder.CreateBox("replacement-on-foot-actor", { size: 1 }, scene);
    replacement.position.copyFromFloats(12, 0, -8);
    const camera = createOnFootCamera({ scene, target: actor });

    camera.setTargetActor(replacement);
    camera.updateView(0, 0);

    expect(scene.activeCamera).toBe(camera);
    expect(Vector3.Distance(camera.getTarget(), replacement.position)).toBeGreaterThan(1);
  });
});
