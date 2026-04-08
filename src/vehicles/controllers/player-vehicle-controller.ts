export interface VehicleControlState {
  throttle: number;
  brake: number;
  steering: number;
  handbrake: boolean;
  lookX: number;
  lookY: number;
  lookInputSource: "none" | "mouse" | "gamepad";
}

export interface OnFootMovementState {
  forward: number;
  right: number;
}

export interface PlayerInputFrame {
  vehicleControls: VehicleControlState;
  onFootMovement: OnFootMovementState;
  switchVehicleRequested: boolean;
  interactionRequested: boolean;
}

export interface VehicleGamepadState {
  axes: readonly number[];
  buttons: readonly Pick<GamepadButton, "value" | "pressed" | "touched">[];
  connected: boolean;
  mapping: string;
}

export interface PlayerVehicleController {
  bindVehicle(vehicle: object): void;
  captureInputFrame(): PlayerInputFrame;
  consumeSwitchVehicleRequest(): boolean;
  getState(): VehicleControlState;
  dispose(): void;
  unbindVehicle(): void;
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
const INTERACTION_KEYS = new Set(["KeyE"]);
const SWITCH_VEHICLE_KEYS = new Set(["Tab"]);
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

function createEmptyMovementState(): OnFootMovementState {
  return {
    forward: 0,
    right: 0
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

function chooseDominantAxis(keyboardValue: number, gamepadValue: number): number {
  return Math.abs(gamepadValue) > Math.abs(keyboardValue) ? gamepadValue : keyboardValue;
}

function readAxisFromKeys(activeKeys: Set<string>, negativeKeys: Set<string>, positiveKeys: Set<string>): number {
  const negative = [...negativeKeys].some((code) => activeKeys.has(code));
  const positive = [...positiveKeys].some((code) => activeKeys.has(code));

  if (negative === positive) {
    return 0;
  }

  return positive ? 1 : -1;
}

export function createPlayerVehicleController(
  options: CreatePlayerVehicleControllerOptions = {}
): PlayerVehicleController {
  const eventTarget = options.eventTarget ?? window;
  const gamepadProvider = options.gamepadProvider ?? (() => Array.from(navigator.getGamepads?.() ?? []));
  const activeKeys = new Set<string>();
  let boundVehicle: object | null = null;
  let interactionRequested = false;
  let switchVehicleRequested = false;

  let mouseLookX = 0;
  let mouseLookY = 0;

  const handleKeyDown = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      if (SWITCH_VEHICLE_KEYS.has(event.code)) {
        event.preventDefault();
        switchVehicleRequested = true;
        return;
      }

      if (INTERACTION_KEYS.has(event.code)) {
        interactionRequested = true;
        return;
      }

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
      mouseLookX -= event.movementX ?? 0;
      mouseLookY += event.movementY ?? 0;
    }
  };

  eventTarget.addEventListener("keydown", handleKeyDown);
  eventTarget.addEventListener("keyup", handleKeyUp);
  eventTarget.addEventListener("mousemove", handleMouseMove);

  const readVehicleControls = (allowDriving: boolean, includeLook: boolean): VehicleControlState => {
    const keyboardState = createEmptyState();

    if (allowDriving) {
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
    }

    if (includeLook) {
      keyboardState.lookX = mouseLookX;
      keyboardState.lookY = mouseLookY;
      if (mouseLookX !== 0 || mouseLookY !== 0) {
        keyboardState.lookInputSource = "mouse";
      }
    }

    mouseLookX = 0;
    mouseLookY = 0;

    const gamepad = gamepadProvider().find((candidate) => candidate?.connected) ?? null;

    if (gamepad === null) {
      return keyboardState;
    }

    const gamepadLookX = includeLook ? applyDeadzone(gamepad.axes[2] ?? 0, GAMEPAD_STEERING_DEADZONE) : 0;

    const gamepadState: VehicleControlState = {
      throttle: allowDriving ? readButtonValue(gamepad.buttons, 7) : 0,
      brake: allowDriving ? readButtonValue(gamepad.buttons, 6) : 0,
      steering: allowDriving ? applyDeadzone(gamepad.axes[0] ?? 0, GAMEPAD_STEERING_DEADZONE) : 0,
      handbrake: allowDriving ? readButtonPressed(gamepad.buttons, 0) : false,
      lookX: gamepadLookX === 0 ? 0 : -gamepadLookX,
      lookY: includeLook ? applyDeadzone(gamepad.axes[3] ?? 0, GAMEPAD_STEERING_DEADZONE) : 0,
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
  };

  const readOnFootMovement = (): OnFootMovementState => {
    const keyboardMovement = createEmptyMovementState();
    keyboardMovement.forward = readAxisFromKeys(activeKeys, BRAKE_KEYS, THROTTLE_KEYS);
    keyboardMovement.right = readAxisFromKeys(activeKeys, STEER_LEFT_KEYS, STEER_RIGHT_KEYS);

    const gamepad = gamepadProvider().find((candidate) => candidate?.connected) ?? null;

    if (gamepad === null) {
      return keyboardMovement;
    }

    const gamepadMovement: OnFootMovementState = {
      forward: -applyDeadzone(gamepad.axes[1] ?? 0, GAMEPAD_STEERING_DEADZONE),
      right: applyDeadzone(gamepad.axes[0] ?? 0, GAMEPAD_STEERING_DEADZONE)
    };

    return {
      forward: chooseDominantAxis(keyboardMovement.forward, gamepadMovement.forward),
      right: chooseDominantAxis(keyboardMovement.right, gamepadMovement.right)
    };
  };

  return {
    bindVehicle: (vehicle: object) => {
      boundVehicle = vehicle;
    },
    captureInputFrame: () => {
      const frame = {
        interactionRequested,
        onFootMovement: readOnFootMovement(),
        switchVehicleRequested: boundVehicle !== null && switchVehicleRequested,
        vehicleControls: readVehicleControls(boundVehicle !== null, true)
      };

      interactionRequested = false;
      switchVehicleRequested = false;

      return frame;
    },
    consumeSwitchVehicleRequest: () => {
      const shouldSwitch = boundVehicle !== null && switchVehicleRequested;

      switchVehicleRequested = false;

      return shouldSwitch;
    },
    getState: () => readVehicleControls(boundVehicle !== null, boundVehicle !== null),
    dispose: () => {
      activeKeys.clear();
      boundVehicle = null;
      interactionRequested = false;
      mouseLookX = 0;
      mouseLookY = 0;
      switchVehicleRequested = false;
      eventTarget.removeEventListener("keydown", handleKeyDown);
      eventTarget.removeEventListener("keyup", handleKeyUp);
      eventTarget.removeEventListener("mousemove", handleMouseMove);
    },
    unbindVehicle: () => {
      boundVehicle = null;
      interactionRequested = false;
      switchVehicleRequested = false;
    }
  };
}
