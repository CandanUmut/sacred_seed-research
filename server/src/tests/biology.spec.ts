import { applyBiology } from '../sim/Biology.js';
import { getScienceData } from '../sim/science.js';
import type { PlayerSimState } from '../sim/World.js';
import type { RegionId } from '@sperm-odyssey/shared';

const science = getScienceData();

function createPlayer(): PlayerSimState {
  return {
    id: 'p1',
    name: 'Test',
    region: 'uterus' as RegionId,
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    capacitation: 0.2,
    stamina: 0.5,
    hyperCooldown: 0,
    acrosomeReady: false,
    effects: { slow: 0, boost: 0 },
    input: { direction: { x: 0, y: 0 }, hyperactivate: false, sequence: 0 },
  };
}

describe('Biology', () => {
  it('increases capacitation over time', () => {
    const player = createPlayer();
    applyBiology(player, science.regions[2], science.gates, 1);
    expect(player.capacitation).toBeGreaterThan(0.2);
  });

  it('activates acrosome readiness in ampulla', () => {
    const player = createPlayer();
    player.region = 'ampulla';
    player.capacitation = 0.9;
    applyBiology(player, science.regions[5], science.gates, 0.1);
    expect(player.acrosomeReady).toBe(true);
  });
});
