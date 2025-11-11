import { defineQuery } from 'bitecs';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Region } from '../components/Region.js';
import { State } from '../components/State.js';
import { getRegionScience } from '../../../science/biology.js';
import { FLOW_FIELD_SCALE, REGION_IDS } from '@sperm-odyssey/shared';

export function createFlowFieldSystem() {
  const query = defineQuery([Transform, Velocity, Region, State]);
  return (world: typeof Transform.world, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      const regionIndex = Region.id[eid] ?? 0;
      const regionId = REGION_IDS[Math.min(regionIndex, REGION_IDS.length - 1)];
      const science = getRegionScience(regionId);
      Velocity.x[eid] += science.flow.x * FLOW_FIELD_SCALE * dt;
      Velocity.y[eid] += science.flow.y * FLOW_FIELD_SCALE * dt;
      State.progress[eid] = Math.min(1, State.progress[eid] + (science.capacitationRate * dt) / 100);
    }
    return world;
  };
}
