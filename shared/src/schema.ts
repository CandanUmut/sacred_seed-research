import { z } from 'zod';
import { POWERUP_TYPES, REGION_IDS } from './constants.js';

export const vectorSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const effectSchema = z.object({
  id: z.string(),
  type: z.union([z.literal('stun'), z.literal('slow'), z.enum(POWERUP_TYPES)]),
  expiresAt: z.number().nonnegative(),
});

export const playerStateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  region: z.enum(REGION_IDS),
  position: vectorSchema,
  velocity: vectorSchema,
  stamina: z.number().min(0).max(100),
  capacitation: z.number().min(0).max(100),
  hyperactive: z.boolean(),
  effects: z.array(effectSchema),
  finished: z.boolean(),
  progress: z.number().min(0).max(1),
});

export const raceSnapshotSchema = z.object({
  tick: z.number().int().nonnegative(),
  players: z.array(playerStateSchema),
  worldSeed: z.string(),
  region: z.enum(REGION_IDS),
  countdown: z.number().optional(),
  winnerId: z.string().optional(),
});

export const helloMessage = z.object({
  type: z.literal('hello'),
  version: z.literal(1),
});

export const joinRoomMessage = z.object({
  type: z.literal('joinRoom'),
  payload: z.object({
    roomId: z.string().optional(),
    displayName: z.string().min(1).max(24),
    mode: z.union([z.literal('singleplayer'), z.literal('multiplayer')]),
  }),
});

export const inputMessage = z.object({
  type: z.literal('inputs'),
  payload: z.object({
    frames: z
      .array(
        z.object({
          tick: z.number().int().nonnegative(),
          direction: vectorSchema,
          hyperactivate: z.boolean(),
        })
      )
      .max(20),
  }),
});

export const stateMessage = z.object({
  type: z.literal('state'),
  payload: raceSnapshotSchema,
});

export const startMessage = z.object({
  type: z.literal('start'),
  payload: z.object({
    startTick: z.number().int().nonnegative(),
    countdownMs: z.number().int().nonnegative(),
  }),
});

export const finishMessage = z.object({
  type: z.literal('finish'),
  payload: z.object({
    playerId: z.string(),
    leaderboard: z.array(
      z.object({
        playerId: z.string(),
        displayName: z.string(),
        timeMs: z.number().int().nonnegative(),
      })
    ),
  }),
});

export const chatMessage = z.object({
  type: z.literal('chat'),
  payload: z.object({
    playerId: z.string().optional(),
    text: z.string().max(160),
  }),
});

export const errorMessage = z.object({
  type: z.literal('error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const protocolMessage = z.discriminatedUnion('type', [
  helloMessage,
  joinRoomMessage,
  inputMessage,
  stateMessage,
  startMessage,
  finishMessage,
  chatMessage,
  errorMessage,
]);

export type ProtocolMessage = z.infer<typeof protocolMessage>;
export type RaceSnapshot = z.infer<typeof raceSnapshotSchema>;
export type PlayerState = z.infer<typeof playerStateSchema>;
