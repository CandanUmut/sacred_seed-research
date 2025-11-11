import type { RegionId, PowerupType } from './constants.js';

export type PlayerId = string;

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerRuntimeState {
  id: PlayerId;
  name: string;
  region: RegionId;
  position: Vector2;
  velocity: Vector2;
  stamina: number;
  capacitation: number;
  hyperactive: boolean;
  effects: EffectState[];
  finished: boolean;
  progress: number; // 0..1 overall race progress
}

export interface EffectState {
  id: string;
  type: 'stun' | 'slow' | PowerupType;
  expiresAt: number;
}

export interface RaceSimulationSnapshot {
  tick: number;
  players: PlayerRuntimeState[];
  worldSeed: string;
  region: RegionId;
  countdown?: number;
  winnerId?: PlayerId;
}

export interface InputFrame {
  tick: number;
  direction: Vector2;
  hyperactivate: boolean;
}

export interface RoomSummary {
  id: string;
  playerCount: number;
  capacity: number;
  status: 'open' | 'racing' | 'cooldown';
}

export interface JoinRoomRequest {
  roomId?: string;
  displayName: string;
  mode: 'singleplayer' | 'multiplayer';
}

export interface FinishPayload {
  playerId: PlayerId;
  timeMs: number;
}
