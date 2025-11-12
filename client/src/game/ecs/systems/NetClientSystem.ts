import { defineQuery } from 'bitecs';
import type { IWorld } from 'bitecs';
import { Player } from '../components/Player.js';
import { Transform } from '../components/Transform.js';
import { State } from '../components/State.js';
import { Velocity } from '../components/Velocity.js';
import { Region } from '../components/Region.js';
import { REGION_IDS, unpackEntity, type Snapshot } from '@sperm-odyssey/shared';

const FINISHED_FLAG = 1 << 0;
const HYPERACTIVE_FLAG = 1 << 1;

export interface SnapshotBuffer {
  latest?: Snapshot;
}

export function createNetClientSystem(buffer: SnapshotBuffer) {
  const query = defineQuery([Player, Transform, State, Velocity, Region]);
  return (world: IWorld) => {
    if (!buffer.latest) return world;
    const snapshot = buffer.latest;
    const entities = snapshot.ents.map(unpackEntity);
    const playerEntity =
      entities.find((entity) => entity.id === snapshot.you) ?? entities[0];
    if (!playerEntity) {
      return world;
    }
    for (const eid of query(world)) {
      Transform.x[eid] = playerEntity.x;
      Transform.y[eid] = playerEntity.y;
      Velocity.x[eid] = playerEntity.vx;
      Velocity.y[eid] = playerEntity.vy;
      State.region[eid] = playerEntity.region;
      const regionProgress = playerEntity.region / Math.max(1, REGION_IDS.length - 1);
      State.progress[eid] = Math.max(0, Math.min(1, regionProgress));
      Player.id[eid] = playerEntity.id;
      Player.capacitation[eid] = Math.max(0, Math.min(100, playerEntity.capacitation * 100));
      Player.hyperactive[eid] = playerEntity.flags & HYPERACTIVE_FLAG ? 1 : 0;
      Player.finished[eid] = playerEntity.flags & FINISHED_FLAG ? 1 : 0;
      Region.id[eid] = playerEntity.region;
    }
    return world;
  };
}
