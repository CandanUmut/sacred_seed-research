import type { RegionId } from '@sperm-odyssey/shared';

interface RegionScience {
  id: RegionId;
  flow: { x: number; y: number };
  capacitationRate: number;
}

interface GateScience {
  id: RegionId;
  capacitationRequired: number;
  speedMinimum?: number;
  hyperactivationRequired?: boolean;
}

interface ChemotaxisScience {
  region: RegionId;
  strength: number;
  noise: number;
}

const REGIONS: RegionScience[] = [
  { id: 'vagina', flow: { x: 0.2, y: -0.6 }, capacitationRate: 0.8 },
  { id: 'cervix', flow: { x: 0.4, y: -0.3 }, capacitationRate: 1.2 },
  { id: 'uterus', flow: { x: 0.0, y: -0.8 }, capacitationRate: 1.6 },
  { id: 'utj', flow: { x: 0.0, y: -0.2 }, capacitationRate: 1.8 },
  { id: 'isthmus', flow: { x: 0.1, y: -0.4 }, capacitationRate: 2.0 },
  { id: 'ampulla', flow: { x: 0.3, y: -0.1 }, capacitationRate: 2.2 },
];

const GATES: GateScience[] = [
  { id: 'utj', capacitationRequired: 55, speedMinimum: 3.2 },
  { id: 'ampulla', capacitationRequired: 75, hyperactivationRequired: true },
];

const CHEM: ChemotaxisScience[] = [
  { region: 'isthmus', strength: 0.2, noise: 0.05 },
  { region: 'ampulla', strength: 0.4, noise: 0.02 },
];

export function getRegionScience(id: RegionId): RegionScience {
  const entry = REGIONS.find((r) => r.id === id);
  if (!entry) throw new Error(`Unknown region ${id}`);
  return entry;
}

export function getGateScience(id: RegionId): GateScience | undefined {
  return GATES.find((g) => g.id === id);
}

export function getChemotaxisScience(id: RegionId): ChemotaxisScience | undefined {
  return CHEM.find((c) => c.region === id);
}
