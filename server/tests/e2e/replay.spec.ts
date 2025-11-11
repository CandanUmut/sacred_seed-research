import { Recorder } from '../../src/replay/Recorder.js';
import { replay } from '../../src/replay/Player.js';
import { SimWorld } from '../../src/sim/World.js';
import { TICK_RATE } from '@sperm-odyssey/shared';

function makeInput(tick: number, flip = false) {
  return {
    t: tick,
    u: !flip,
    d: false,
    l: flip,
    r: !flip,
    ha: tick % 20 === 0,
  };
}

describe('Replay determinism', () => {
  it('replays recorded inputs deterministically', () => {
    const header = { version: 1 as const, seed: 123, worldHash: 'SimWorld:v1', startedAt: Date.now() };
    const recorder = new Recorder(header);
    const world = new SimWorld('seed:test-room');
    const agentA = world.addPlayer('a', 'Alpha');
    const agentB = world.addPlayer('b', 'Beta');
    const sampleInterval = Math.max(1, Math.round(TICK_RATE / 10));
    const expected: Array<{ tick: number; id: number; x: number; y: number; vx: number; vy: number }> = [];

    for (let tick = 1; tick <= TICK_RATE * 10; tick += 1) {
      const inputA = makeInput(tick, tick % 2 === 0);
      const inputB = makeInput(tick, tick % 3 === 0);
      world.queueInput('a', inputA);
      world.queueInput('b', inputB);
      recorder.addInput({ ...inputA, id: agentA.entityId });
      recorder.addInput({ ...inputB, id: agentB.entityId });
      world.step();
      if (tick % sampleInterval === 0) {
        for (const entity of world.getEntities()) {
          expected.push({
            tick,
            id: entity.id,
            x: entity.x,
            y: entity.y,
            vx: entity.vx,
            vy: entity.vy,
          });
        }
      }
    }

    const blob = recorder.toBuffer();
    const samples = replay(blob, () => new SimWorld('seed:test-room'));
    expect(samples.samples.length).toBeGreaterThanOrEqual(expected.length);
    const byKey = new Map<string, (typeof samples.samples)[number]>();
    for (const sample of samples.samples) {
      byKey.set(`${sample.tick}:${sample.id}`, sample);
    }
    for (const truth of expected) {
      const key = `${truth.tick}:${truth.id}`;
      const sample = byKey.get(key);
      expect(sample).toBeDefined();
      if (!sample) continue;
      expect(Math.abs(sample.x - truth.x)).toBeLessThan(0.2);
      expect(Math.abs(sample.y - truth.y)).toBeLessThan(0.2);
    }
  });
});
