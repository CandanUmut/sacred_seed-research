import type { RegionId } from '@sperm-odyssey/shared';
import type { SeededRng } from '@sperm-odyssey/shared';

type CapacitationProfile = {
  region: RegionId;
  ratePerSecond: number;
  ceiling: number;
};

type GateRequirement = {
  region: RegionId;
  capacitationThreshold: number;
  speedMin: number;
  angleWindow: number;
};

type ChemotaxisParams = {
  falloff: number;
  strength: number;
  noise: number;
};

type AcrosomeWindow = {
  region: RegionId;
  durationMs: number;
  startDelayMs: number;
};

const CAPACITATION_TABLE: CapacitationProfile[] = [
  { region: 'vagina', ratePerSecond: 0.015, ceiling: 0.25 },
  { region: 'cervix', ratePerSecond: 0.025, ceiling: 0.4 },
  { region: 'uterus', ratePerSecond: 0.04, ceiling: 0.65 },
  { region: 'utj', ratePerSecond: 0.06, ceiling: 0.78 },
  { region: 'isthmus', ratePerSecond: 0.08, ceiling: 0.92 },
  { region: 'ampulla', ratePerSecond: 0.05, ceiling: 1 },
];

const GATE_REQUIREMENTS: GateRequirement[] = [
  { region: 'utj', capacitationThreshold: 0.6, speedMin: 2.2, angleWindow: Math.PI / 3 },
  { region: 'ampulla', capacitationThreshold: 0.85, speedMin: 2.5, angleWindow: Math.PI / 2 },
];

const CHEMOTAXIS_TABLE: Record<RegionId, ChemotaxisParams> = {
  vagina: { falloff: 0.35, strength: 0.08, noise: 0.05 },
  cervix: { falloff: 0.35, strength: 0.08, noise: 0.05 },
  uterus: { falloff: 0.25, strength: 0.11, noise: 0.04 },
  utj: { falloff: 0.2, strength: 0.12, noise: 0.03 },
  isthmus: { falloff: 0.1, strength: 0.15, noise: 0.02 },
  ampulla: { falloff: 0.06, strength: 0.18, noise: 0.015 },
};

const ACROSOME_WINDOWS: AcrosomeWindow[] = [
  { region: 'isthmus', durationMs: 30_000, startDelayMs: 15_000 },
  { region: 'ampulla', durationMs: 45_000, startDelayMs: 5_000 },
];

export interface CapacitationState {
  value: number;
  region: RegionId;
}

export function isCapacitated(
  state: CapacitationState,
  timeInTractMs: number,
  region: RegionId
): number {
  const profile = CAPACITATION_TABLE.find((entry) => entry.region === region);
  if (!profile) return state.value;
  const progress = Math.min(timeInTractMs / 1000, 600);
  const gained = profile.ratePerSecond * progress;
  const value = Math.min(profile.ceiling, state.value + gained);
  return Math.min(1, Math.max(0, value));
}

export interface PassAgentState {
  capacitation: number;
  speed: number;
  heading: number;
  rng: SeededRng;
}

export function canPassUTJ(agent: PassAgentState, region: RegionId, timeMs: number): boolean {
  const requirement = GATE_REQUIREMENTS.find((gate) => gate.region === region);
  if (!requirement) return true;
  if (agent.capacitation < requirement.capacitationThreshold) return false;
  if (agent.speed < requirement.speedMin) return false;
  const desiredHeading = Math.PI / -2;
  const delta = normalizeAngle(agent.heading - desiredHeading);
  const withinCone = Math.abs(delta) <= requirement.angleWindow * 0.5;
  if (!withinCone) return false;
  const wobble = 0.04 * Math.sin((timeMs / 1000) * 2.1 + agent.rng.next());
  return withinCone && agent.capacitation + wobble >= requirement.capacitationThreshold;
}

export function chemotaxisVector(
  position: { x: number; y: number },
  eggPos: { x: number; y: number },
  region: RegionId,
  rng: SeededRng
): { x: number; y: number } {
  const params = CHEMOTAXIS_TABLE[region];
  if (!params) return { x: 0, y: 0 };
  const dx = eggPos.x - position.x;
  const dy = eggPos.y - position.y;
  const distance = Math.hypot(dx, dy) || 1;
  const falloff = Math.exp(-distance * params.falloff);
  const strength = params.strength * falloff;
  const nx = rng.gaussian(0, params.noise);
  const ny = rng.gaussian(0, params.noise);
  return {
    x: (dx / distance) * strength + nx,
    y: (dy / distance) * strength + ny,
  };
}

export interface AcrosomeState {
  activatedAtMs?: number;
}

export function acrosomeWindowActive(state: AcrosomeState, region: RegionId, timeMs: number): boolean {
  const window = ACROSOME_WINDOWS.find((entry) => entry.region === region);
  if (!window) return true;
  const start = (state.activatedAtMs ?? timeMs) + window.startDelayMs;
  return timeMs >= start && timeMs <= start + window.durationMs;
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}
