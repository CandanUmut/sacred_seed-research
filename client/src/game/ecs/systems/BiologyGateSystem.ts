import { defineQuery } from 'bitecs';
import type { IWorld } from 'bitecs';
import { Player } from '../components/Player.js';
import { State } from '../components/State.js';
import { Region } from '../components/Region.js';
import { Velocity } from '../components/Velocity.js';
import { REGION_IDS } from '@sperm-odyssey/shared';
import { getGateScience } from '../../../science/biology.js';

export function createBiologyGateSystem() {
  const query = defineQuery([Player, State, Region, Velocity]);
  return (world: IWorld, delta: number) => {
    const dt = delta / 60;
    for (const eid of query(world)) {
      const progress = State.progress[eid];
      const regionIndex = Region.id[eid];
      const regionId = REGION_IDS[Math.min(regionIndex, REGION_IDS.length - 1)];
      Player.capacitation[eid] = Math.min(100, Player.capacitation[eid] + dt * 2 + progress * 5);
      const gate = getGateScience(regionId);
      if (gate) {
        const speed = Math.hypot(Velocity.x[eid], Velocity.y[eid]);
        const meetsCap = Player.capacitation[eid] >= gate.capacitationRequired;
        const meetsSpeed = gate.speedMinimum ? speed >= gate.speedMinimum : true;
        const meetsHyper = gate.hyperactivationRequired ? State.hyperTimer[eid] > 0 : true;
        if (!(meetsCap && meetsSpeed && meetsHyper)) {
          Velocity.x[eid] *= 0.4;
          Velocity.y[eid] *= 0.4;
        } else {
          // allow progression forward
          if (regionIndex < REGION_IDS.length - 1) {
            Region.id[eid] = regionIndex + 1;
          }
        }
      }
    }
    return world;
  };
}
