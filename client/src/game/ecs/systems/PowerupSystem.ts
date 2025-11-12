import { defineQuery } from 'bitecs';
import type { IWorld } from 'bitecs';
import { Player } from '../components/Player.js';
import { Effects } from '../components/Effects.js';

export function createPowerupSystem() {
  const query = defineQuery([Player, Effects]);
  return (world: IWorld, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      if (Player.stamina[eid] < 30) {
        Effects.slow[eid] = Math.min(1, Effects.slow[eid] + dt * 0.2);
      } else {
        Effects.slow[eid] = Math.max(0, Effects.slow[eid] - dt * 0.2);
      }
    }
    return world;
  };
}
