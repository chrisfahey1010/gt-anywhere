export type WorldLoadFailureCode = "WORLD_GENERATION_FAILED" | "WORLD_SCENE_LOAD_FAILED";

export type WorldLoadFailureStage = "world-generating" | "world-loading";

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
