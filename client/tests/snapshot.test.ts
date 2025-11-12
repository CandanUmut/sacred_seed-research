import { describe, expect, it } from 'vitest';
import type { Application } from 'pixi.js';
import { initWorld } from '../src/game/ecs/world.js';
import { createNetClientSystem } from '../src/game/ecs/systems/NetClientSystem.js';
import { Transform } from '../src/game/ecs/components/Transform.js';
import { Velocity } from '../src/game/ecs/components/Velocity.js';
import { Player } from '../src/game/ecs/components/Player.js';
import { Region } from '../src/game/ecs/components/Region.js';
import { packEntity, PLAYER_FLAG, type Snapshot } from '@sperm-odyssey/shared';

describe('NetClientSystem', () => {
  it('applies snapshot data to the local player', () => {
    const context = initWorld({} as Application);
    const entity = packEntity({
      id: context.entities.player,
      x: 12.5,
      y: -4.25,
      vx: 1.1,
      vy: -0.9,
      region: 3,
      capacitation: 0.6,
      flags: PLAYER_FLAG.DASHING,
    });
    const snapshot: Snapshot = { sTick: 12, you: context.entities.player, ents: [entity] };
    const buffer = { latest: snapshot };
    const system = createNetClientSystem(buffer);
    system(context.world);

    const eid = context.entities.player;
    expect(Transform.x[eid]).toBeCloseTo(12.5, 2);
    expect(Transform.y[eid]).toBeCloseTo(-4.25, 2);
    expect(Velocity.x[eid]).toBeCloseTo(1.1, 2);
    expect(Velocity.y[eid]).toBeCloseTo(-0.9, 2);
    expect(Region.id[eid]).toBe(3);
    expect(Player.capacitation[eid]).toBeCloseTo(60, 4);
    expect(Player.hyperactive[eid]).toBe(1);
  });
});
