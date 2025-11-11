import {
  REGION_PROGRESSION,
  TRACK_LENGTH_METERS,
  PLAYER_BASE_SPEED,
  PLAYER_MAX_SPEED,
  HYPERACTIVATION_COOLDOWN,
  HYPERACTIVATION_DURATION,
  HYPERACTIVATION_COST,
  MAX_CAPACITATION,
  MAX_STAMINA,
  FLOW_FIELD_SCALE,
} from '@sperm-odyssey/shared';
import type { RegionId, RaceSnapshot, PlayerState, InputFrame } from '@sperm-odyssey/shared';
import { SeededRng } from './RNG.js';
import { getRegionScience, getGateScience, getChemotaxisScience } from './Biology.js';
import { canPassGate } from './BiologyRules.js';

interface PlayerSimState {
  id: string;
  name: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  progress: number;
  region: RegionId;
  stamina: number;
  capacitation: number;
  hyperTimer: number;
  hyperCooldown: number;
  finished: boolean;
  effects: { type: 'stun' | 'slow'; duration: number }[];
  input: InputFrame;
  finishTick?: number;
}

export class SimWorld {
  private players = new Map<string, PlayerSimState>();
  private rng: SeededRng;
  private tick = 0;

  constructor(seed: string) {
    this.rng = new SeededRng(seed);
  }

  addPlayer(id: string, name: string): void {
    const player: PlayerSimState = {
      id,
      name,
      position: { x: this.rng.range(50, 150), y: this.rng.range(50, 150) },
      velocity: { x: 0, y: 0 },
      progress: 0,
      region: 'vagina',
      stamina: MAX_STAMINA,
      capacitation: 10,
      hyperTimer: 0,
      hyperCooldown: 0,
      finished: false,
      effects: [],
      input: { tick: 0, direction: { x: 0, y: -1 }, hyperactivate: false },
    };
    this.players.set(id, player);
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  applyInputs(id: string, frames: InputFrame[]): void {
    const player = this.players.get(id);
    if (!player) return;
    const latest = frames.at(-1);
    if (latest) {
      player.input = latest;
    }
  }

  step(dt: number): void {
    this.tick += 1;
    const distancePerTick = (PLAYER_BASE_SPEED * dt) / 1000;
    for (const player of this.players.values()) {
      if (player.finished) continue;
      const regionScience = getRegionScience(player.region);
      player.capacitation = Math.min(MAX_CAPACITATION, player.capacitation + regionScience.capacitationRate * dt * 0.001);
      const gate = getGateScience(player.region);
      const hyperactive = player.hyperTimer > 0;
      if (player.hyperTimer > 0) {
        player.hyperTimer = Math.max(0, player.hyperTimer - dt / 1000);
      }
      if (player.hyperCooldown > 0) {
        player.hyperCooldown = Math.max(0, player.hyperCooldown - dt / 1000);
      }

      if (player.input.hyperactivate && player.hyperCooldown <= 0 && player.stamina > HYPERACTIVATION_COST) {
        player.hyperTimer = HYPERACTIVATION_DURATION;
        player.hyperCooldown = HYPERACTIVATION_COOLDOWN;
        player.stamina -= HYPERACTIVATION_COST;
      }

      const norm = Math.hypot(player.input.direction.x, player.input.direction.y) || 1;
      let dx = (player.input.direction.x / norm) * distancePerTick;
      let dy = (player.input.direction.y / norm) * distancePerTick;

      const flowX = regionScience.flow.x * FLOW_FIELD_SCALE * dt * 0.001;
      const flowY = regionScience.flow.y * FLOW_FIELD_SCALE * dt * 0.001;
      dx += flowX;
      dy += flowY;

      const chem = getChemotaxisScience(player.region);
      if (chem) {
        dx += (this.rng.next() - 0.5) * chem.noise;
        dy += -Math.abs(chem.strength) * dt * 0.001;
      }

      const speed = Math.hypot(dx, dy) / (dt / 1000);
      const limit = hyperactive ? PLAYER_MAX_SPEED : PLAYER_BASE_SPEED * 1.2;
      if (speed > limit) {
        const scalar = limit / speed;
        dx *= scalar;
        dy *= scalar;
      }

      player.position.x += dx * 100;
      player.position.y += dy * 100;
      player.velocity.x = dx / (dt / 1000);
      player.velocity.y = dy / (dt / 1000);
      player.progress = Math.min(1, player.progress + Math.abs(dy) / TRACK_LENGTH_METERS * 30);

      if (gate) {
        const canPass = canPassGate(
          player.region,
          player.capacitation,
          Math.abs(player.velocity.y),
          hyperactive
        );
        if (canPass) {
          const index = REGION_PROGRESSION.indexOf(player.region);
          if (index < REGION_PROGRESSION.length - 1) {
            player.region = REGION_PROGRESSION[index + 1];
          }
        }
      } else {
        const threshold = (REGION_PROGRESSION.indexOf(player.region) + 1) / REGION_PROGRESSION.length;
        if (player.progress > threshold && player.region !== 'ampulla') {
          const index = REGION_PROGRESSION.indexOf(player.region);
          player.region = REGION_PROGRESSION[Math.min(index + 1, REGION_PROGRESSION.length - 1)];
        }
      }

      if (player.region === 'ampulla' && player.progress >= 0.99 && !player.finished) {
        player.finished = true;
        player.finishTick = this.tick;
      }

      player.stamina = Math.min(MAX_STAMINA, player.stamina + dt * 0.02);
    }
  }

  createSnapshot(): RaceSnapshot {
    const players: PlayerState[] = [];
    for (const player of this.players.values()) {
      players.push({
        id: player.id,
        name: player.name,
        region: player.region,
        position: { ...player.position },
        velocity: { ...player.velocity },
        stamina: Math.round(player.stamina),
        capacitation: Math.round(player.capacitation),
        hyperactive: player.hyperTimer > 0,
        effects: player.effects.map((effect, idx) => ({ id: `${player.id}-${idx}`, type: effect.type, expiresAt: Date.now() + effect.duration * 1000 })),
        finished: player.finished,
        progress: player.progress,
      });
    }
    return {
      tick: this.tick,
      players,
      worldSeed: 'seed',
      region: players[0]?.region ?? 'vagina',
    };
  }

  getWinners(): PlayerSimState[] {
    return [...this.players.values()].filter((player) => player.finished).sort((a, b) => (a.finishTick ?? Infinity) - (b.finishTick ?? Infinity));
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getTick(): number {
    return this.tick;
  }
}
