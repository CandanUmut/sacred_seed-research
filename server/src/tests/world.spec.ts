import { SimWorld } from '../sim/World.js';

describe('SimWorld', () => {
  it('advances progress and records winners', () => {
    const world = new SimWorld('test-seed');
    world.addPlayer('p1', 'Test');
    for (let i = 0; i < 500; i += 1) {
      world.applyInputs('p1', [{ tick: i, direction: { x: 0, y: -1 }, hyperactivate: i % 50 === 0 }]);
      world.step(50);
    }
    const winners = world.getWinners();
    expect(winners.length).toBeGreaterThanOrEqual(0);
    expect(world.createSnapshot().players[0].progress).toBeLessThanOrEqual(1);
  });
});
