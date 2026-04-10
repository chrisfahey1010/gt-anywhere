export type WorldLoadFailureCode =
  | "WORLD_GENERATION_FAILED"
  | "WORLD_SCENE_LOAD_FAILED"
  | "STARTER_VEHICLE_SPAWN_FAILED"
  | "STARTER_VEHICLE_POSSESSION_FAILED";

export type WorldLoadFailureStage =
  | "world-generating"
  | "world-loading"
  | "vehicle-spawning"
  | "vehicle-possession";

export interface WorldLoadFailure {
  ok: false;
  code: WorldLoadFailureCode;
  stage: WorldLoadFailureStage;
  message: string;
  recoverable: true;
  placeName: string;
  details: Record<string, unknown>;
}

export function createWorldLoadFailure(
  code: WorldLoadFailureCode,
  stage: WorldLoadFailureStage,
  message: string,
  placeName: string,
  details: Record<string, unknown> = {}
): WorldLoadFailure {
  return {
    ok: false,
    code,
    stage,
    message,
    recoverable: true,
    placeName,
    details
  };
}

export class WorldSceneRuntimeError extends Error {
  readonly failureCode: WorldLoadFailureCode;

  readonly failureStage: WorldLoadFailureStage;

  readonly failureDetails: Record<string, unknown>;

  constructor(
    failureCode: WorldLoadFailureCode,
    failureStage: WorldLoadFailureStage,
    message: string,
    failureDetails: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "WorldSceneRuntimeError";
    this.failureCode = failureCode;
    this.failureStage = failureStage;
    this.failureDetails = failureDetails;
  }
}

export function createWorldSceneRuntimeError(
  failureCode: WorldLoadFailureCode,
  failureStage: WorldLoadFailureStage,
  message: string,
  failureDetails: Record<string, unknown> = {}
): WorldSceneRuntimeError {
  return new WorldSceneRuntimeError(failureCode, failureStage, message, failureDetails);
}

export function isWorldSceneRuntimeError(error: unknown): error is WorldSceneRuntimeError {
  return error instanceof WorldSceneRuntimeError;
}
