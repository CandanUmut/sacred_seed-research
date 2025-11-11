import { SimWorld } from '../sim/World.js';
import type { InputMsg } from '@sperm-odyssey/shared';

function forwardInput(tick: number): InputMsg {
  return { t: tick, u: true, d: false, l: false, r: false, ha: tick % 30 === 0 };
}

describe('SimWorld', () => {
  it('advances players with queued inputs', () => {
    const world = new SimWorld('spec-seed');
    world.addPlayer('session-1', 'Tester');
    const before = world.listAgents()[0];

    for (let tick = 1; tick <= 200; tick += 1) {
      world.queueInput('session-1', forwardInput(tick));
      world.step();
    }

    const after = world.listAgents()[0];
    expect(after.timeInTract).toBeGreaterThan(before.timeInTract);
    expect(world.getFinishedAgents().length).toBeGreaterThanOrEqual(0);
    expect(world.getTick()).toBeGreaterThan(0);
  });
});
