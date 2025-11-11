import { defineQuery } from 'bitecs';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Player } from '../components/Player.js';
import { State } from '../components/State.js';
import { PLAYER_BASE_SPEED, PLAYER_MAX_SPEED, HYPERACTIVATION_COST, HYPERACTIVATION_DURATION, HYPERACTIVATION_COOLDOWN } from '@sperm-odyssey/shared';

const keys = new Set<string>();
window.addEventListener('keydown', (event) => keys.add(event.key.toLowerCase()));
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));

export function createInputSystem() {
  const query = defineQuery([Transform, Velocity, Player, State]);
  return (world: typeof Transform.world, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      let moveX = 0;
      let moveY = 0;
      if (keys.has('w') || keys.has('arrowup')) moveY -= 1;
      if (keys.has('s') || keys.has('arrowdown')) moveY += 1;
      if (keys.has('a') || keys.has('arrowleft')) moveX -= 1;
      if (keys.has('d') || keys.has('arrowright')) moveX += 1;
      const hyperactivate = keys.has(' ');

      const length = Math.hypot(moveX, moveY) || 1;
      moveX /= length;
      moveY /= length;

      const hyperTimer = State.hyperTimer[eid];
      const cooldown = State.hyperCooldown[eid];
      const stamina = Player.stamina[eid];
      if (hyperactivate && cooldown <= 0 && stamina > HYPERACTIVATION_COST) {
        State.hyperTimer[eid] = HYPERACTIVATION_DURATION;
        State.hyperCooldown[eid] = HYPERACTIVATION_COOLDOWN;
        Player.stamina[eid] -= HYPERACTIVATION_COST;
      }

      if (State.hyperTimer[eid] > 0) {
        State.hyperTimer[eid] -= dt;
        Velocity.x[eid] = moveX * PLAYER_MAX_SPEED;
        Velocity.y[eid] = moveY * PLAYER_MAX_SPEED;
      } else {
        Velocity.x[eid] = moveX * PLAYER_BASE_SPEED;
        Velocity.y[eid] = moveY * PLAYER_BASE_SPEED;
      }

      if (State.hyperCooldown[eid] > 0) {
        State.hyperCooldown[eid] -= dt;
      }
      if (!hyperactivate) {
        Player.stamina[eid] = Math.min(Player.stamina[eid] + dt * 10, 100);
      }
    }
    return world;
  };
}
