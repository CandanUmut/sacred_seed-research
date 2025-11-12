import { defineQuery } from 'bitecs';
import type { IWorld } from 'bitecs';
import { Player } from '../components/Player.js';
import { Transform } from '../components/Transform.js';
import { State } from '../components/State.js';
import { Velocity } from '../components/Velocity.js';
import type { RaceSnapshot } from '@sperm-odyssey/shared';

export interface SnapshotBuffer {
  latest?: RaceSnapshot;
}

export function createNetClientSystem(buffer: SnapshotBuffer) {
  const query = defineQuery([Player, Transform, State, Velocity]);
  return (world: IWorld) => {
    if (!buffer.latest) return world;
    const snapshot = buffer.latest;
    for (const eid of query(world)) {
      const playerState = snapshot.players[0];
      if (playerState) {
        Transform.x[eid] = playerState.position.x;
        Transform.y[eid] = playerState.position.y;
        Velocity.x[eid] = playerState.velocity.x;
        Velocity.y[eid] = playerState.velocity.y;
        State.progress[eid] = playerState.progress;
      }
    }
    return world;
  };
}
