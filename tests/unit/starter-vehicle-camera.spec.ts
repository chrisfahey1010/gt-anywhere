import { MeshBuilder, Scene } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";

describe("starter vehicle camera", () => {
  it("creates a non-orbit follow camera that locks onto the spawned vehicle", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);

    const camera = createStarterVehicleCamera({ scene, target });

    expect(camera.getClassName()).toBe("FollowCamera");
    expect(camera.lockedTarget).toBe(target);
    expect(camera.inputs.attachedToElement).toBe(false);
    expect(scene.activeCamera).toBe(camera);

    scene.dispose();
    engine.dispose();
  });
});
