import { describe, expect, it } from 'vitest';
import { initWorld } from '../src/game/ecs/world.js';
import { createBiologyGateSystem } from '../src/game/ecs/systems/BiologyGateSystem.js';
import { createFlowFieldSystem } from '../src/game/ecs/systems/FlowFieldSystem.js';
import { Player } from '../src/game/ecs/components/Player.js';
import { Region } from '../src/game/ecs/components/Region.js';
import { Velocity } from '../src/game/ecs/components/Velocity.js';
import { REGION_IDS } from '@sperm-odyssey/shared';

const dummyApp = { renderer: { width: 800, height: 600 } } as unknown as import('pixi.js').Application;

describe('Biology gates', () => {
  it('requires capacitation to progress', () => {
    const context = initWorld(dummyApp);
    Region.id[context.entities.player] = REGION_IDS.indexOf('utj');
    Player.capacitation[context.entities.player] = 0;
    const system = createBiologyGateSystem();
    const flow = createFlowFieldSystem();
    flow(context.world, 16);
    system(context.world, 16);
    expect(Region.id[context.entities.player]).toBe(REGION_IDS.indexOf('utj'));
    Player.capacitation[context.entities.player] = 80;
    Velocity.y[context.entities.player] = -5;
    for (let i = 0; i < 5; i += 1) {
      system(context.world, 16);
    }
    expect(Region.id[context.entities.player]).toBeGreaterThanOrEqual(REGION_IDS.indexOf('isthmus'));
  });
});
