import { Packr } from 'msgpackr';
import { z } from 'zod';
import { POS_Q, VEL_Q } from './constants.js';
import type { EntityPack } from './types.js';

export const InputMsg = z.object({
  t: z.number().int(),
  u: z.boolean(),
  d: z.boolean(),
  l: z.boolean(),
  r: z.boolean(),
  ha: z.boolean(),
});
export type InputMsg = z.infer<typeof InputMsg>;

export const JoinRoomMsg = z.object({
  room: z.string().min(1).max(32),
  name: z
    .string()
    .min(1)
    .max(20)
    .transform((value) => sanitizeName(value)),
});
export type JoinRoomMsg = z.infer<typeof JoinRoomMsg>;

export const StartMsg = z.object({
  tick: z.number().int().nonnegative(),
  countdownMs: z.number().int().nonnegative(),
});
export type StartMsg = z.infer<typeof StartMsg>;

export const FinishMsg = z.object({
  winner: z.number().int().nonnegative(),
  leaderboard: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string(),
      timeMs: z.number().int().nonnegative(),
    })
  ),
});
export type FinishMsg = z.infer<typeof FinishMsg>;

export const ChatMsg = z.object({
  text: z.string().max(160),
});
export type ChatMsg = z.infer<typeof ChatMsg>;

export const Snapshot = z.object({
  sTick: z.number().int(),
  you: z.number().int(),
  ents: z.array(
    z.tuple([
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
      z.number().int(),
    ])
  ),
});
export type Snapshot = z.infer<typeof Snapshot>;

const snapshotPackr = new Packr({ structuredClone: true });

export function encodeSnapshot(snapshot: Snapshot): Uint8Array {
  return snapshotPackr.encode(snapshot);
}

export function decodeSnapshot(buffer: Uint8Array): Snapshot {
  return Snapshot.parse(snapshotPackr.decode(buffer)) as Snapshot;
}

export function quantizePosition(value: number): number {
  return Math.round(value * POS_Q);
}

export function dequantizePosition(qValue: number): number {
  return qValue / POS_Q;
}

export function quantizeVelocity(value: number): number {
  return Math.round(value * VEL_Q);
}

export function dequantizeVelocity(qValue: number): number {
  return qValue / VEL_Q;
}

export function quantizeCapacitation(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 255);
}

export function dequantizeCapacitation(qValue: number): number {
  return Math.max(0, Math.min(1, qValue / 255));
}

function sanitizeName(value: string): string {
  return value
    .replace(/[^\p{L}0-9 _-]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20) || 'Explorer';
}

export function packEntity(entity: {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  region: number;
  capacitation: number;
  flags: number;
}): EntityPack {
  return [
    entity.id,
    quantizePosition(entity.x),
    quantizePosition(entity.y),
    quantizeVelocity(entity.vx),
    quantizeVelocity(entity.vy),
    entity.region,
    quantizeCapacitation(entity.capacitation),
    entity.flags | 0,
  ];
}

export function unpackEntity(pack: EntityPack): {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  region: number;
  capacitation: number;
  flags: number;
} {
  return {
    id: pack[0],
    x: dequantizePosition(pack[1]),
    y: dequantizePosition(pack[2]),
    vx: dequantizeVelocity(pack[3]),
    vy: dequantizeVelocity(pack[4]),
    region: pack[5],
    capacitation: dequantizeCapacitation(pack[6]),
    flags: pack[7],
  };
}
