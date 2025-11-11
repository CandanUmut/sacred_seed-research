import { defineQuery } from 'bitecs';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Effects } from '../components/Effects.js';

export function createCollisionSystem(bounds: { width: number; height: number }) {
  const query = defineQuery([Transform, Velocity, Effects]);
  return (world: typeof Transform.world, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      const x = Transform.x[eid];
      const y = Transform.y[eid];
      if (x < 32) {
        Transform.x[eid] = 32;
        Velocity.x[eid] = Math.abs(Velocity.x[eid]) * 0.5;
      } else if (x > bounds.width - 32) {
        Transform.x[eid] = bounds.width - 32;
        Velocity.x[eid] = -Math.abs(Velocity.x[eid]) * 0.5;
      }
      if (y < 32) {
        Transform.y[eid] = 32;
        Velocity.y[eid] = Math.abs(Velocity.y[eid]) * 0.5;
      } else if (y > bounds.height - 32) {
        Transform.y[eid] = bounds.height - 32;
        Velocity.y[eid] = -Math.abs(Velocity.y[eid]) * 0.5;
      }
      if (Effects.stun[eid] > 0) {
        Effects.stun[eid] = Math.max(0, Effects.stun[eid] - dt);
      }
    }
    return world;
  };
}
