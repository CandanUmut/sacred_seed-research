export const TICK_RATE = 20;
export const TICK_MS = Math.floor(1000 / TICK_RATE);
export const SNAPSHOT_RATE = 12;
export const SNAPSHOT_MS = Math.floor(1000 / SNAPSHOT_RATE);
export const MAX_PLAYERS_PER_ROOM = 120;
export const INTEREST_NEAREST = 24;
export const POS_Q = 16;
export const VEL_Q = 256;

export const REGION_IDS = [
  'vagina',
  'cervix',
  'uterus',
  'utj',
  'isthmus',
  'ampulla',
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export const REGION_PROGRESSION: RegionId[] = [...REGION_IDS];

// Approximate total path length between spawn and ampulla finish in world units.
// Used for UI progress meters and ghost overlays; keep in sync with SimWorld.
export const TRACK_LENGTH_METERS = 3280;

export const DEFAULT_SETTINGS = {
  reducedMotion: false,
  colorblindMode: 'default' as 'default' | 'tritan' | 'deutan' | 'protan',
  uiScale: 1,
  narration: false,
};

export const POWERUP_TYPES = [
  'alkaline-buffer',
  'motility-boost',
  'navigation-ping',
  'mucus-slip',
] as const;
export type PowerupType = (typeof POWERUP_TYPES)[number];

export const MAX_INPUT_BUFFER = 12;
export const MAX_STAMINA = 100;
export const MAX_CAPACITATION = 100;
export const HYPERACTIVATION_COST = 35;
export const HYPERACTIVATION_DURATION = 2.5;
export const HYPERACTIVATION_COOLDOWN = 8;

export const IMMUNE_STUN_DURATION = 2;
export const FLOW_FIELD_SCALE = 0.6;
export const PLAYER_BASE_SPEED = 2.8;
export const PLAYER_MAX_SPEED = 7.5;
export const PLAYER_RADIUS = 0.45;

export const SNAPSHOT_BUFFER = 6;

export const LOBBY_HEARTBEAT_INTERVAL = 15_000;

export const DEFAULT_ROOM_CONFIG = {
  seed: 'classroom-seed',
  snapshotRate: SNAPSHOT_RATE,
  tickRate: TICK_RATE,
  capacity: 300,
};
