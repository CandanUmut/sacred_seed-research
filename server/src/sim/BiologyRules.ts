import type { RegionId } from '@sperm-odyssey/shared';
import { getGateScience } from './Biology.js';

export function canPassGate(region: RegionId, capacitation: number, speed: number, hyperactive: boolean): boolean {
  const gate = getGateScience(region);
  if (!gate) return true;
  if (capacitation < gate.capacitationRequired) return false;
  if (gate.speedMinimum && speed < gate.speedMinimum) return false;
  if (gate.hyperactivationRequired && !hyperactive) return false;
  return true;
}
