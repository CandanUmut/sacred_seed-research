import { addComponent, addEntity, createWorld } from 'bitecs';
import type { Application } from 'pixi.js';
import { Transform } from './components/Transform.js';
import { Velocity } from './components/Velocity.js';
import { Player } from './components/Player.js';
import { State } from './components/State.js';
import { Region } from './components/Region.js';
import { Effects } from './components/Effects.js';

export interface GameContext {
  app: Application;
  world: ReturnType<typeof createWorld>;
  entities: {
    player: number;
  };
  delta: number;
  elapsed: number;
}

export function initWorld(app: Application): GameContext {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, Transform, player);
  addComponent(world, Velocity, player);
  addComponent(world, Player, player);
  addComponent(world, State, player);
  addComponent(world, Region, player);
  addComponent(world, Effects, player);

  Transform.x[player] = 100;
  Transform.y[player] = 100;
  State.progress[player] = 0;
  State.region[player] = 0;
  Player.stamina[player] = 80;
  Player.capacitation[player] = 5;

  return {
    app,
    world,
    entities: { player },
    delta: 0,
    elapsed: 0,
  };
}
