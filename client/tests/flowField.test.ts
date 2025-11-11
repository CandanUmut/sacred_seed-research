import { describe, expect, it } from 'vitest';
import { initWorld } from '../src/game/ecs/world.js';
import { createFlowFieldSystem } from '../src/game/ecs/systems/FlowFieldSystem.js';
import { REGION_IDS } from '@sperm-odyssey/shared';
import { Region } from '../src/game/ecs/components/Region.js';
import { State } from '../src/game/ecs/components/State.js';

const dummyApp = { renderer: { width: 800, height: 600 } } as unknown as import('pixi.js').Application;

describe('FlowFieldSystem', () => {
  it('accelerates progress in early regions', () => {
    const context = initWorld(dummyApp);
    Region.id[context.entities.player] = REGION_IDS.indexOf('vagina');
    const system = createFlowFieldSystem();
    system(context.world, 16);
    expect(State.progress[context.entities.player]).toBeGreaterThan(0);
  });
});
