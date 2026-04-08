export interface VehicleControlState {
  throttle: number;
  brake: number;
  steering: number;
  handbrake: boolean;
  lookX: number;
  lookY: number;
  lookInputSource: "none" | "mouse" | "gamepad";
}

export interface VehicleGamepadState {
  axes: readonly number[];
  buttons: readonly Pick<GamepadButton, "value" | "pressed" | "touched">[];
  connected: boolean;
  mapping: string;
}

export interface PlayerVehicleController {
  getState(): VehicleControlState;
  dispose(): void;
}

export interface CreatePlayerVehicleControllerOptions {
  eventTarget?: Pick<Window, "addEventListener" | "removeEventListener">;
  gamepadProvider?: () => readonly (VehicleGamepadState | null | undefined)[];
}

const THROTTLE_KEYS = new Set(["KeyW", "ArrowUp"]);
const BRAKE_KEYS = new Set(["KeyS", "ArrowDown"]);
const STEER_LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const STEER_RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
const HANDBRAKE_KEYS = new Set(["Space"]);
const GAMEPAD_STEERING_DEADZONE = 0.15;

function createEmptyState(): VehicleControlState {
  return {
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: false,
    lookX: 0,
    lookY: 0,
    lookInputSource: "none"
  };
}

function readButtonValue(buttons: readonly Pick<GamepadButton, "value" | "pressed" | "touched">[], index: number): number {
  return buttons[index]?.value ?? 0;
}

function readButtonPressed(buttons: readonly Pick<GamepadButton, "value" | "pressed" | "touched">[], index: number): boolean {
  return buttons[index]?.pressed ?? false;
}

function applyDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) >= deadzone ? value : 0;
}

function chooseDominantSteering(keyboardSteering: number, gamepadSteering: number): number {
  return Math.abs(gamepadSteering) > Math.abs(keyboardSteering) ? gamepadSteering : keyboardSteering;
}

export function createPlayerVehicleController(
  options: CreatePlayerVehicleControllerOptions = {}
): PlayerVehicleController {
  const eventTarget = options.eventTarget ?? window;
  const gamepadProvider = options.gamepadProvider ?? (() => Array.from(navigator.getGamepads?.() ?? []));
  const activeKeys = new Set<string>();

  let mouseLookX = 0;
  let mouseLookY = 0;

  const handleKeyDown = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      activeKeys.add(event.code);
    }
  };

  const handleKeyUp = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      activeKeys.delete(event.code);
    }
  };

  const handleMouseMove = (event: Event): void => {
    if (event instanceof MouseEvent) {
      mouseLookX += event.movementX ?? 0;
      mouseLookY += event.movementY ?? 0;
    }
  };

  eventTarget.addEventListener("keydown", handleKeyDown);
  eventTarget.addEventListener("keyup", handleKeyUp);
  eventTarget.addEventListener("mousemove", handleMouseMove);

  return {
    getState: () => {
      const keyboardState = createEmptyState();

      if ([...THROTTLE_KEYS].some((code) => activeKeys.has(code))) {
        keyboardState.throttle = 1;
      }

      if ([...BRAKE_KEYS].some((code) => activeKeys.has(code))) {
        keyboardState.brake = 1;
      }

      if ([...STEER_LEFT_KEYS].some((code) => activeKeys.has(code))) {
        keyboardState.steering -= 1;
      }

      if ([...STEER_RIGHT_KEYS].some((code) => activeKeys.has(code))) {
        keyboardState.steering += 1;
      }

      if ([...HANDBRAKE_KEYS].some((code) => activeKeys.has(code))) {
        keyboardState.handbrake = true;
      }

      keyboardState.lookX = mouseLookX;
      keyboardState.lookY = mouseLookY;
      if (mouseLookX !== 0 || mouseLookY !== 0) {
        keyboardState.lookInputSource = "mouse";
      }

      // Reset mouse look delta after reading
      mouseLookX = 0;
      mouseLookY = 0;

      const gamepad = gamepadProvider().find((candidate) => candidate?.connected) ?? null;

      if (gamepad === null) {
        return keyboardState;
      }

      const gamepadState: VehicleControlState = {
        throttle: readButtonValue(gamepad.buttons, 7),
        brake: readButtonValue(gamepad.buttons, 6),
        steering: applyDeadzone(gamepad.axes[0] ?? 0, GAMEPAD_STEERING_DEADZONE),
        handbrake: readButtonPressed(gamepad.buttons, 0),
        lookX: applyDeadzone(gamepad.axes[2] ?? 0, GAMEPAD_STEERING_DEADZONE),
        lookY: applyDeadzone(gamepad.axes[3] ?? 0, GAMEPAD_STEERING_DEADZONE),
        lookInputSource: "none"
      };

      if (gamepadState.lookX !== 0 || gamepadState.lookY !== 0) {
        gamepadState.lookInputSource = "gamepad";
      }

      const useMouseLook = keyboardState.lookInputSource === "mouse";
      const useGamepadLook = gamepadState.lookInputSource === "gamepad";

      return {
        throttle: Math.max(keyboardState.throttle, gamepadState.throttle),
        brake: Math.max(keyboardState.brake, gamepadState.brake),
        steering: chooseDominantSteering(keyboardState.steering, gamepadState.steering),
        handbrake: keyboardState.handbrake || gamepadState.handbrake,
        lookX: useMouseLook ? keyboardState.lookX : gamepadState.lookX,
        lookY: useMouseLook ? keyboardState.lookY : gamepadState.lookY,
        lookInputSource: useMouseLook ? "mouse" : useGamepadLook ? "gamepad" : "none"
      };
    },
    dispose: () => {
      activeKeys.clear();
      mouseLookX = 0;
      mouseLookY = 0;
      eventTarget.removeEventListener("keydown", handleKeyDown);
      eventTarget.removeEventListener("keyup", handleKeyUp);
      eventTarget.removeEventListener("mousemove", handleMouseMove);
    }
  };
}
