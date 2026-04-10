import { MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { createStarterVehicleCamera } from "../../src/vehicles/cameras/create-starter-vehicle-camera";
import { PlayerVehicleController } from "../../src/vehicles/controllers/player-vehicle-controller";

function createMockController(overrides: Partial<ReturnType<PlayerVehicleController["getState"]>> = {}): PlayerVehicleController {
  return {
    bindVehicle: () => {},
    captureInputFrame: () => ({
      combatControls: {
        firePressed: false,
        weaponCycleDirection: 0,
        weaponSlotRequested: null
      },
      interactionRequested: false,
      onFootMovement: {
        forward: 0,
        right: 0
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
        ...overrides
      }
    }),
    consumeSwitchVehicleRequest: () => false,
    getState: () => ({
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      lookX: 0,
      lookY: 0,
      lookInputSource: "none",
      ...overrides
    }),
    dispose: () => {},
    unbindVehicle: () => {}
  };
}

describe("starter vehicle camera", () => {
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

  it("creates a camera that tracks the vehicle", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const camera = createStarterVehicleCamera({ scene, target, controller: createMockController() });

    expect(camera).toBeDefined();
    expect(scene.activeCamera).toBe(camera);
  });

  it("adjusts field of view based on vehicle forward velocity", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    let velocity = new Vector3(0, 0, 50);
    
    target.physicsBody = {
      getLinearVelocityToRef: (ref: Vector3) => {
        ref.copyFrom(velocity);
      },
      getLinearVelocity: () => velocity.clone(),
      dispose: () => {}
    } as any;

    const camera = createStarterVehicleCamera({ scene, target, controller: createMockController() });
    const baseFov = camera.fov;
    
    for (let frame = 0; frame < 10; frame += 1) {
      scene.render();
    }

    expect(camera.fov).toBeGreaterThan(baseFov);
  });

  it("applies rotational damping and vertical filtering when the vehicle moves suddenly", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    
    target.physicsBody = {
      getLinearVelocityToRef: (ref: Vector3) => {
        ref.setAll(0);
      },
      getLinearVelocity: () => Vector3.Zero(),
      dispose: () => {}
    } as any;

    const camera = createStarterVehicleCamera({ scene, target, controller: createMockController() });
    
    // Initial render to set base position
    for (let frame = 0; frame < 10; frame += 1) {
      scene.render();
    }
    const initialPos = camera.position.clone();
    
    // Simulate sudden jump, turn, and body tilt.
    target.position.y += 10;
    target.rotation.x += Math.PI / 5;
    target.rotation.y += Math.PI / 2;
    target.rotation.z += Math.PI / 8;

    scene.render();

    // Camera should not immediately snap to the new exact offset
    const immediateOffsetPos = target.position.subtract(target.forward.scale(8)).add(new Vector3(0, 2.5, 0));
    // The camera position should be between initialPos and immediateOffsetPos (interpolating)
    expect(camera.position.y).toBeLessThan(immediateOffsetPos.y);
    expect(camera.position.y).toBeGreaterThan(initialPos.y);
    expect(Vector3.Distance(camera.position, immediateOffsetPos)).toBeGreaterThan(0.5);
  });

  it("keeps the look target flatter than the vehicle body tilt", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const camera = createStarterVehicleCamera({ scene, target, controller: createMockController() });

    scene.render();

    target.rotation.x += Math.PI / 5;
    target.rotation.z += Math.PI / 8;

    for (let i = 0; i < 10; i++) {
      scene.render();
    }

    const pitchedLookAt = target.position.add(target.forward.scale(5));
    expect(Math.abs(camera.getTarget().y - target.position.y)).toBeLessThan(
      Math.abs(pitchedLookAt.y - target.position.y)
    );
  });

  it("allows temporary free-look control that orbits the camera around the vehicle", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const controller = createMockController();
    const camera = createStarterVehicleCamera({ scene, target, controller });

    scene.render();
    const baseLookAt = camera.getTarget().clone();
    const basePos = camera.position.clone();

    // Simulate input
    controller.getState = () => ({
      throttle: 0, brake: 0, steering: 0, handbrake: false,
      lookX: 10, lookY: 0, lookInputSource: "mouse"
    });

    for (let i = 0; i < 10; i++) {
      scene.render();
    }

    const activeLookAt = camera.getTarget().clone();
    const activePos = camera.position.clone();

    expect(Vector3.Distance(activeLookAt, baseLookAt)).toBeGreaterThan(0.5);
    expect(Vector3.Distance(activePos, basePos)).toBeGreaterThan(0.5);
  });

  it("can read free-look input from a shared world-frame provider", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const camera = createStarterVehicleCamera({
      scene,
      target,
      controller: createMockController(),
      getInputState: () => ({
        throttle: 0,
        brake: 0,
        steering: 0,
        handbrake: false,
        lookX: 12,
        lookY: 0,
        lookInputSource: "mouse"
      })
    });

    for (let frame = 0; frame < 10; frame += 1) {
      scene.render();
    }

    expect(Vector3.Distance(camera.getTarget(), target.position.add(target.forward.scale(5)))).toBeGreaterThan(0.25);
  });

  it("returns to center when manual input stops", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const controller = createMockController();
    const camera = createStarterVehicleCamera({ scene, target, controller });

    // Simulate input to offset it
    controller.getState = () => ({
      throttle: 0, brake: 0, steering: 0, handbrake: false,
      lookX: 60, lookY: 30, lookInputSource: "mouse"
    });
    scene.render();

    const activeLookAt = camera.getTarget().clone();

    // Stop input
    controller.getState = () => ({
      throttle: 0, brake: 0, steering: 0, handbrake: false,
      lookX: 0, lookY: 0, lookInputSource: "none"
    });

    // Render multiple times to allow return-to-center lerping
    for (let i = 0; i < 60; i++) {
      scene.render();
    }

    const centeredLookAt = camera.getTarget().clone();
    expect(Vector3.Distance(centeredLookAt, activeLookAt)).toBeGreaterThan(0.25);
    // Should be close to default forward target
    const expectedCenterLookAt = target.position.add(target.forward.scale(5));
    expect(Vector3.Distance(centeredLookAt, expectedCenterLookAt)).toBeLessThan(1.0);
  });

  it("transitions into a reverse camera after sustained backward motion", () => {
    const target = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const velocity = new Vector3(0, 0, -6);

    target.physicsBody = {
      getLinearVelocityToRef: (ref: Vector3) => {
        ref.copyFrom(velocity);
      },
      getLinearVelocity: () => velocity.clone(),
      dispose: () => {}
    } as any;

    const controller = createMockController();
    const camera = createStarterVehicleCamera({ scene, target, controller });

    for (let i = 0; i < 60; i++) {
      scene.render();
    }

    expect(camera.position.z).toBeGreaterThan(target.position.z);
    expect(camera.getTarget().z).toBeLessThan(target.position.z);
  });

  it("retargets to a replacement vehicle without breaking the active camera", () => {
    const initialTarget = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, scene);
    const replacementTarget = MeshBuilder.CreateBox("replacement-vehicle", { size: 1 }, scene);
    replacementTarget.position.copyFromFloats(24, 0, 12);
    const camera = createStarterVehicleCamera({
      scene,
      target: initialTarget,
      controller: createMockController()
    });

    for (let frame = 0; frame < 5; frame += 1) {
      scene.render();
    }

    const initialLookAt = camera.getTarget().clone();
    camera.setVehicleTarget(replacementTarget);

    for (let frame = 0; frame < 10; frame += 1) {
      scene.render();
    }

    expect(scene.activeCamera).toBe(camera);
    expect(Vector3.Distance(camera.getTarget(), initialLookAt)).toBeGreaterThan(5);
    expect(camera.getTarget().z).toBeGreaterThan(initialLookAt.z);
  });

  it("keeps gamepad free-look response stable across frame times", () => {
    const runFor = (deltaTimeMs: number, frameCount: number): number => {
      const localEngine = new NullEngine();
      const localScene = new Scene(localEngine);
      const localTarget = MeshBuilder.CreateBox("starter-vehicle", { size: 1 }, localScene);
      const localController = createMockController({
        lookX: 1,
        lookY: 0,
        lookInputSource: "gamepad"
      });
      const localCamera = createStarterVehicleCamera({
        scene: localScene,
        target: localTarget,
        controller: localController
      });
      const engineApi = localScene.getEngine() as { getDeltaTime(): number };
      const originalGetDeltaTime = engineApi.getDeltaTime;
      engineApi.getDeltaTime = () => deltaTimeMs;

      for (let frame = 0; frame < frameCount; frame += 1) {
        localScene.render();
      }

      const lookTargetX = localCamera.getTarget().x;
      engineApi.getDeltaTime = originalGetDeltaTime;
      localScene.dispose();
      localEngine.dispose();

      return lookTargetX;
    };

    const fastFrameTargetX = runFor(16, 30);
    const slowFrameTargetX = runFor(32, 15);

    expect(Math.abs(fastFrameTargetX - slowFrameTargetX)).toBeLessThan(0.6);
  });
});
