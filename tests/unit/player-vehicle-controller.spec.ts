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
  it("keeps baseline keyboard driving inputs available", () => {
    const controller = createPlayerVehicleController({ eventTarget: window });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));

    expect(controller.getState()).toEqual({
      throttle: 1,
      brake: 0,
      steering: -1,
      handbrake: true
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

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));

    expect(controller.getState()).toEqual({
      throttle: 1,
      brake: 0.35,
      steering: -0.6,
      handbrake: true
    });

    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    controller.dispose();
  });
});
