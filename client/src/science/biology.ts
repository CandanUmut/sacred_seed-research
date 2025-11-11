import regionsData from './data/regions.json';
import gatesData from './data/gates.json';
import chemotaxisData from './data/chemotaxis.json';
import type { RegionId } from '@sperm-odyssey/shared';

export interface RegionScienceData {
  id: RegionId;
  ph: number;
  viscosity: number;
  flow: { x: number; y: number };
  capacitationRate: number;
}

export interface GateScienceData {
  id: RegionId;
  capacitationRequired: number;
  angleTolerance?: number;
  speedMinimum?: number;
  hyperactivationRequired?: boolean;
  acrosomeWindow?: number;
}

export interface ChemotaxisScienceData {
  region: RegionId;
  strength: number;
  noise: number;
}

export const REGIONS: RegionScienceData[] = regionsData as RegionScienceData[];
export const GATES: GateScienceData[] = gatesData as GateScienceData[];
export const CHEMOTAXIS: ChemotaxisScienceData[] = chemotaxisData as ChemotaxisScienceData[];

export function getRegionScience(id: RegionId): RegionScienceData {
  const entry = REGIONS.find((r) => r.id === id);
  if (!entry) throw new Error(`Unknown region ${id}`);
  return entry;
}

export function getGateScience(id: RegionId): GateScienceData | undefined {
  return GATES.find((gate) => gate.id === id);
}

export function getChemotaxisScience(id: RegionId): ChemotaxisScienceData | undefined {
  return CHEMOTAXIS.find((entry) => entry.region === id);
}
