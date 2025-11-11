import { defineQuery } from 'bitecs';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Effects } from '../components/Effects.js';
import { PLAYER_MAX_SPEED } from '@sperm-odyssey/shared';

export function createMovementSystem() {
  const query = defineQuery([Transform, Velocity, Effects]);
  return (world: typeof Transform.world, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      let vx = Velocity.x[eid];
      let vy = Velocity.y[eid];
      const speed = Math.hypot(vx, vy);
      if (speed > PLAYER_MAX_SPEED) {
        vx = (vx / speed) * PLAYER_MAX_SPEED;
        vy = (vy / speed) * PLAYER_MAX_SPEED;
      }
      const slow = Effects.slow[eid];
      const stun = Effects.stun[eid];
      if (stun > 0) {
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        Effects.stun[eid] = Math.max(0, stun - dt);
        continue;
      }
      if (slow > 0) {
        vx *= 1 - Math.min(0.9, slow);
        vy *= 1 - Math.min(0.9, slow);
        Effects.slow[eid] = Math.max(0, slow - dt * 0.5);
      }
      Transform.x[eid] += vx * dt * 60;
      Transform.y[eid] += vy * dt * 60;
      Velocity.x[eid] = vx;
      Velocity.y[eid] = vy;
    }
    return world;
  };
}
