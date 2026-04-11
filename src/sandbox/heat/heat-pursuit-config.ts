type HeatLevelKey = 0 | 1 | 2 | 3 | 4;

export const HEAT_RESPONDER_COUNT_BY_LEVEL: Record<HeatLevelKey, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4
};

export const HEAT_PURSUIT_DISPATCH_SECONDS = 1.5;
export const HEAT_CONTACT_LOSS_SECONDS = 4;
export const HEAT_ESCAPE_COOLDOWN_SECONDS = 8;
export const HEAT_CAPTURE_SECONDS = 6;
export const HEAT_SCORE_DECAY_PER_SECOND = 6;
export const HEAT_RESPONDER_DIRECT_CONTACT_DISTANCE = 16;
export const HEAT_RESPONDER_SPAWN_OFFSET_DISTANCE = 28;
export const HEAT_RESPONDER_SPACING_DISTANCE = 12;
export const HEAT_RESPONDER_TARGET_OFFSET_DISTANCE = 10;
