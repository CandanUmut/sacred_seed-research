import { z } from 'zod';

export const ReplayHeader = z.object({
  version: z.literal(1),
  seed: z.number().int(),
  worldHash: z.string(),
  startedAt: z.number().int(),
});

export const ReplayInput = z.object({
  t: z.number().int(),
  id: z.number().int(),
  u: z.boolean(),
  d: z.boolean(),
  l: z.boolean(),
  r: z.boolean(),
  ha: z.boolean(),
});

export const ReplayBlob = z.object({
  header: ReplayHeader,
  inputs: z.array(ReplayInput),
});

export type ReplayBlob = z.infer<typeof ReplayBlob>;

export type ReplaySample = {
  id: number;
  tick: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export const ReplaySamples = z.object({
  header: ReplayHeader,
  samples: z.array(
    z.object({
      id: z.number().int(),
      tick: z.number().int(),
      x: z.number(),
      y: z.number(),
      vx: z.number(),
      vy: z.number(),
    }),
  ),
});

export type ReplaySamples = z.infer<typeof ReplaySamples>;
