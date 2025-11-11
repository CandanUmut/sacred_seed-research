import { unpack } from 'msgpackr';
import { ReplayBlob, ReplaySamples } from '@sperm-odyssey/shared';
import { TICK_RATE } from '@sperm-odyssey/shared';
import type { SimWorld } from '../sim/World.js';
import type { InputMsg } from '@sperm-odyssey/shared';

export interface ReplayWorldFactory {
  (): SimWorld;
}

export interface ReplayOptions {
  sampleRateHz?: number;
  settleTicks?: number;
}

export function replay(buffer: Uint8Array, worldFactory: ReplayWorldFactory, options: ReplayOptions = {}) {
  const { sampleRateHz = 10, settleTicks = TICK_RATE * 2 } = options;
  const { header, inputs } = unpack(buffer) as ReplayBlob;
  const world = worldFactory();
  const sampleInterval = Math.max(1, Math.round(TICK_RATE / sampleRateHz));
  let nextSampleTick = world.getTick();
  const samples: { tick: number; id: number; x: number; y: number; vx: number; vy: number }[] = [];
  const sessions = prepareSessions(world, inputs);

  const queueByTick = inputs.slice().sort((a, b) => a.t - b.t);
  for (const input of queueByTick) {
    advance(world, input.t, sampleInterval, () => {
      if (world.getTick() >= nextSampleTick) {
        pushSamples(world, samples);
        nextSampleTick += sampleInterval;
      }
    });
    const sessionId = sessions.get(input.id);
    if (!sessionId) continue;
    world.queueInput(sessionId, toInputMsg(input));
  }

  advance(world, world.getTick() + settleTicks, sampleInterval, () => {
    if (world.getTick() >= nextSampleTick) {
      pushSamples(world, samples);
      nextSampleTick += sampleInterval;
    }
  });

  return ReplaySamples.parse({
    header,
    samples: samples.map(({ id, tick, x, y, vx, vy }) => ({ id, tick, x, y, vx, vy })),
  });
}

function prepareSessions(world: SimWorld, inputs: ReplayBlob['inputs']): Map<number, string> {
  const map = new Map<number, string>();
  for (const { id } of inputs) {
    if (map.has(id)) continue;
    const session = `ghost-${id}`;
    world.spawnGhost(session, id, `Ghost ${id}`);
    map.set(id, session);
  }
  return map;
}

function advance(world: SimWorld, targetTick: number, sampleInterval: number, onSample: () => void): void {
  while (world.getTick() < targetTick) {
    world.step();
    if (world.getTick() % sampleInterval === 0) {
      onSample();
    }
  }
}

function pushSamples(world: SimWorld, samples: Array<{ tick: number; id: number; x: number; y: number; vx: number; vy: number }>): void {
  const tick = world.getTick();
  for (const entity of world.getEntities()) {
    samples.push({ tick, id: entity.id, x: entity.x, y: entity.y, vx: entity.vx, vy: entity.vy });
  }
}

function toInputMsg(input: ReplayBlob['inputs'][number]): InputMsg {
  return { t: input.t, u: input.u, d: input.d, l: input.l, r: input.r, ha: input.ha };
}
