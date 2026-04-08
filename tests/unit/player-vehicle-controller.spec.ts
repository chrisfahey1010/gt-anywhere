import {
  createPlayerVehicleController,
  type VehicleGamepadState
} from "../../src/vehicles/controllers/player-vehicle-controller";

function createButton(value: number): GamepadButton {
  return {
    value,
    pressed: value > 0.5,
    touched: value > 0
  };
}

function createGamepadState(overrides: Partial<VehicleGamepadState> = {}): VehicleGamepadState {
  const buttons = Array.from({ length: 8 }, () => createButton(0));

  buttons[0] = createButton(1);
  buttons[6] = createButton(0.35);
  buttons[7] = createButton(0.8);

  return {
    axes: [-0.6, 0],
    buttons,
    connected: true,
    mapping: "standard",
    ...overrides
  };
}

describe("player vehicle controller", () => {
  it("only exposes driving input while a vehicle is bound", () => {
    const controller = createPlayerVehicleController({ eventTarget: window });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));

    expect(controller.getState()).toEqual({
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      lookX: 0,
      lookY: 0,
      lookInputSource: "none"
    });

    controller.bindVehicle({});
    expect(controller.getState().throttle).toBe(1);

    controller.unbindVehicle();
    expect(controller.getState()).toEqual({
      throttle: 0,
      brake: 0,
      steering: 0,
      handbrake: false,
      lookX: 0,
      lookY: 0,
      lookInputSource: "none"
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    controller.dispose();
  });

  it("keeps baseline keyboard driving inputs available", () => {
    const controller = createPlayerVehicleController({ eventTarget: window });

    controller.bindVehicle({});

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));

    expect(controller.getState()).toEqual({
      throttle: 1,
      brake: 0,
      steering: -1,
      handbrake: true,
      lookX: 0,
      lookY: 0,
      lookInputSource: "none"
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    controller.dispose();
  });

  it("merges standard gamepad input without blocking the keyboard contract", () => {
    const controller = createPlayerVehicleController({
      eventTarget: window,
      gamepadProvider: () => [createGamepadState()]
    });

    controller.bindVehicle({});

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));

    expect(controller.getState()).toEqual({
      throttle: 1,
      brake: 0.35,
      steering: -0.6,
      handbrake: true,
      lookX: 0,
      lookY: 0,
      lookInputSource: "none"
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    controller.dispose();
  });

  it("captures mouse movement for free-look and zeroes it out after reading", () => {
    const controller = createPlayerVehicleController({ eventTarget: window });

    controller.bindVehicle({});

    // Simulate mouse move
    const event = new MouseEvent("mousemove");
    Object.defineProperty(event, "movementX", { value: 15 });
    Object.defineProperty(event, "movementY", { value: -10 });
    window.dispatchEvent(event);

    const state1 = controller.getState();
    expect(state1.lookX).toBe(15);
    expect(state1.lookY).toBe(-10);
    expect(state1.lookInputSource).toBe("mouse");

    // Should be zero after first read (delta is per frame)
    const state2 = controller.getState();
    expect(state2.lookX).toBe(0);
    expect(state2.lookY).toBe(0);
    expect(state2.lookInputSource).toBe("none");

    controller.dispose();
  });

  it("captures gamepad right stick for free-look", () => {
    const controller = createPlayerVehicleController({
      eventTarget: window,
      gamepadProvider: () => [createGamepadState({ axes: [0, 0, 0.8, -0.6] })]
    });

    controller.bindVehicle({});

    const state = controller.getState();
    expect(state.lookX).toBeGreaterThan(0);
    expect(state.lookY).toBeLessThan(0);
    expect(state.lookInputSource).toBe("gamepad");

    controller.dispose();
  });

  it("emits a one-shot vehicle switch request from the Tab key while bound", () => {
    const controller = createPlayerVehicleController({ eventTarget: window });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Tab" }));
    expect(controller.consumeSwitchVehicleRequest()).toBe(false);

    controller.bindVehicle({});
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Tab" }));

    expect(controller.consumeSwitchVehicleRequest()).toBe(true);
    expect(controller.consumeSwitchVehicleRequest()).toBe(false);

    controller.unbindVehicle();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Tab" }));
    expect(controller.consumeSwitchVehicleRequest()).toBe(false);

    controller.dispose();
  });
});
