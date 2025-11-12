import {
  INTEREST_NEAREST,
  PLAYER_BASE_SPEED,
  PLAYER_FLAG,
  PLAYER_MAX_SPEED,
  REGION_IDS,
  REGION_PROGRESSION,
  TICK_MS,
  type RegionId,
} from '@sperm-odyssey/shared';
import type { InputMsg } from '@sperm-odyssey/shared';
import { SeededRng } from '@sperm-odyssey/shared';
import type { EntityState } from '@sperm-odyssey/shared';
import {
  applyCollision,
  integrateVelocity,
  inputVector,
  segmentSlowdown,
  type PhysicsState,
  type Vector2,
} from './Physics.js';
import {
  acrosomeWindowActive,
  canPassUTJ,
  chemotaxisVector,
  isCapacitated,
  type AcrosomeState,
} from './Biology.js';

interface RegionDefinition {
  id: RegionId;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  exitY: number;
  mucus: { x1: number; y1: number; x2: number; y2: number; strength: number }[];
  flow: Vector2[][]; // grid 4x4
}

interface AgentState extends PhysicsState {
  entityId: number;
  sessionId: string;
  name: string;
  regionIndex: number;
  stamina: number;
  capacitation: number;
  hyperTimer: number;
  hyperCooldown: number;
  timeInRegion: number;
  timeInTract: number;
  rng: SeededRng;
  input: InputMsg;
  inputHistory: InputMsg[];
  finished: boolean;
  finishTick?: number;
  acrosome: AcrosomeState;
}

const REGION_DEFS: RegionDefinition[] = [
  {
    id: 'vagina',
    bounds: { minX: 200, minY: 200, maxX: 820, maxY: 900 },
    exitY: 220,
    mucus: [
      { x1: 300, y1: 400, x2: 720, y2: 410, strength: 0.35 },
      { x1: 260, y1: 650, x2: 760, y2: 660, strength: 0.25 },
    ],
    flow: buildFlowField({ x: 0.2, y: -0.4 }),
  },
  {
    id: 'cervix',
    bounds: { minX: 280, minY: -200, maxX: 740, maxY: 220 },
    exitY: -180,
    mucus: [
      { x1: 320, y1: 0, x2: 700, y2: 10, strength: 0.45 },
      { x1: 350, y1: -80, x2: 670, y2: -70, strength: 0.3 },
    ],
    flow: buildFlowField({ x: 0.15, y: -0.5 }),
  },
  {
    id: 'uterus',
    bounds: { minX: 230, minY: -900, maxX: 790, maxY: -180 },
    exitY: -880,
    mucus: [
      { x1: 260, y1: -360, x2: 760, y2: -350, strength: 0.25 },
      { x1: 260, y1: -620, x2: 760, y2: -610, strength: 0.25 },
    ],
    flow: buildFlowField({ x: 0, y: -0.7 }),
  },
  {
    id: 'utj',
    bounds: { minX: 360, minY: -1180, maxX: 660, maxY: -880 },
    exitY: -1160,
    mucus: [
      { x1: 380, y1: -1020, x2: 640, y2: -1010, strength: 0.5 },
    ],
    flow: buildFlowField({ x: 0, y: -0.3 }),
  },
  {
    id: 'isthmus',
    bounds: { minX: 380, minY: -1720, maxX: 640, maxY: -1160 },
    exitY: -1700,
    mucus: [
      { x1: 400, y1: -1400, x2: 620, y2: -1390, strength: 0.3 },
    ],
    flow: buildFlowField({ x: 0.05, y: -0.35 }),
  },
  {
    id: 'ampulla',
    bounds: { minX: 320, minY: -2400, maxX: 700, maxY: -1700 },
    exitY: -2380,
    mucus: [
      { x1: 340, y1: -1900, x2: 680, y2: -1890, strength: 0.1 },
    ],
    flow: buildFlowField({ x: 0.15, y: -0.2 }),
  },
];

const CHEM_EGG_POS = { x: 520, y: -2300 };

function buildFlowField(base: Vector2): Vector2[][] {
  const grid: Vector2[][] = [];
  for (let y = 0; y < 4; y += 1) {
    const row: Vector2[] = [];
    for (let x = 0; x < 4; x += 1) {
      const wobble = (y / 3) * 0.15 + (x / 3) * 0.1;
      row.push({ x: base.x + wobble * 0.2, y: base.y - wobble });
    }
    grid.push(row);
  }
  return grid;
}

function regionIndex(id: RegionId): number {
  return REGION_IDS.indexOf(id);
}

export class SimWorld {
  private readonly rng: SeededRng;
  private readonly regionMap = new Map<RegionId, RegionDefinition>();
  private tick = 0;
  private nextEntityId = 1;
  private readonly agents = new Map<number, AgentState>();
  private readonly sessionToEntity = new Map<string, number>();
  private polyspermyLock = false;

  constructor(seed: string) {
    this.rng = new SeededRng(seed);
    for (const region of REGION_DEFS) {
      this.regionMap.set(region.id, region);
    }
  }

  get tickRate(): number {
    return Math.round(1000 / TICK_MS);
  }

  getTick(): number {
    return this.tick;
  }

  addPlayer(sessionId: string, name: string): AgentState {
    const entityId = this.nextEntityId++;
    const startRegion = REGION_DEFS[0];
    const agent: AgentState = {
      entityId,
      sessionId,
      name,
      position: {
        x: (startRegion.bounds.minX + startRegion.bounds.maxX) / 2 + this.rng.gaussian(0, 12),
        y: startRegion.bounds.maxY - 40 + this.rng.gaussian(0, 10),
      },
      velocity: { x: 0, y: 0 },
      regionIndex: 0,
      stamina: 1,
      capacitation: 0.05,
      hyperTimer: 0,
      hyperCooldown: 0,
      timeInRegion: 0,
      timeInTract: 0,
      rng: this.rng.fork(`agent-${entityId}`),
      input: { t: 0, u: false, d: false, l: false, r: false, ha: false },
      inputHistory: [],
      finished: false,
      acrosome: {},
    };
    this.agents.set(entityId, agent);
    this.sessionToEntity.set(sessionId, entityId);
    return agent;
  }

  spawnGhost(sessionId: string, entityId: number, name: string): AgentState {
    const agent = this.addPlayer(sessionId, name);
    if (agent.entityId !== entityId) {
      this.agents.delete(agent.entityId);
      agent.entityId = entityId;
      this.agents.set(entityId, agent);
      this.sessionToEntity.set(sessionId, entityId);
      this.nextEntityId = Math.max(this.nextEntityId, entityId + 1);
    }
    return agent;
  }

  removePlayer(sessionId: string): void {
    const entityId = this.sessionToEntity.get(sessionId);
    if (!entityId) return;
    this.sessionToEntity.delete(sessionId);
    this.agents.delete(entityId);
  }

  getEntityId(sessionId: string): number | undefined {
    return this.sessionToEntity.get(sessionId);
  }

  queueInput(sessionId: string, input: InputMsg): void {
    const entityId = this.sessionToEntity.get(sessionId);
    if (!entityId) return;
    const agent = this.agents.get(entityId);
    if (!agent || agent.finished) return;
    if (input.t <= agent.input.t) return;
    agent.inputHistory.push(input);
    if (agent.inputHistory.length > INTEREST_NEAREST * 4) {
      agent.inputHistory.splice(0, agent.inputHistory.length - INTEREST_NEAREST * 4);
    }
    agent.input = input;
  }

  step(tickMs = TICK_MS): void {
    const dt = tickMs / 1000;
    this.tick += 1;
    const nowMs = this.tick * tickMs;
    for (const agent of this.agents.values()) {
      if (agent.finished) continue;
      const regionDef = REGION_DEFS[agent.regionIndex];
      agent.timeInRegion += tickMs;
      agent.timeInTract += tickMs;

      const boost = agent.input.ha && agent.hyperCooldown <= 0 && agent.stamina > 0.15;
      if (boost && agent.hyperTimer <= 0) {
        agent.hyperTimer = 1.5;
        agent.hyperCooldown = 6;
        agent.stamina = Math.max(0, agent.stamina - 0.25);
      }

      if (agent.hyperTimer > 0) {
        agent.hyperTimer -= dt;
        agent.hyperCooldown = Math.max(0, agent.hyperCooldown - dt);
      } else {
        agent.hyperCooldown = Math.max(0, agent.hyperCooldown - dt * 0.75);
        agent.stamina = Math.min(1, agent.stamina + dt * 0.05);
      }

      const desired = inputVector({
        u: agent.input.u,
        d: agent.input.d,
        l: agent.input.l,
        r: agent.input.r,
        boost,
      });

      const flow = this.sampleFlow(regionDef, agent.position, nowMs);
      const chem = chemotaxisVector(agent.position, CHEM_EGG_POS, regionDef.id, agent.rng);
      const params = {
        viscosity: 3.2,
        drag: 1.2,
        acceleration: boost ? PLAYER_MAX_SPEED * 0.9 : PLAYER_BASE_SPEED * 0.8,
        maxSpeed: boost ? PLAYER_MAX_SPEED * 1.2 : PLAYER_MAX_SPEED,
      };

      integrateVelocity(agent, desired, { x: flow.x + chem.x, y: flow.y + chem.y }, dt, params);
      applyCollision(agent, regionDef.bounds);
      for (const mucus of regionDef.mucus) {
        segmentSlowdown(agent, mucus);
      }

      if (agent.position.y <= regionDef.exitY) {
        this.advanceRegion(agent, nowMs);
      }

      agent.capacitation = isCapacitated(
        { value: agent.capacitation, region: regionDef.id },
        agent.timeInTract,
        regionDef.id
      );

      if (regionDef.id === 'utj') {
        const pass = canPassUTJ(
          {
            capacitation: agent.capacitation,
            speed: Math.hypot(agent.velocity.x, agent.velocity.y),
            heading: Math.atan2(agent.velocity.y, agent.velocity.x),
            rng: agent.rng,
          },
          regionDef.id,
          nowMs
        );
        if (!pass) {
          agent.position.y = Math.max(agent.position.y, regionDef.exitY + 5);
          agent.velocity.y *= 0.5;
        }
      }

      if (regionDef.id === 'ampulla' && !this.polyspermyLock) {
        const nearEgg = Math.hypot(agent.position.x - CHEM_EGG_POS.x, agent.position.y - CHEM_EGG_POS.y);
        if (nearEgg < 60 && acrosomeWindowActive(agent.acrosome, regionDef.id, nowMs)) {
          this.polyspermyLock = true;
          agent.finished = true;
          agent.finishTick = this.tick;
        }
      }
    }
  }

  private advanceRegion(agent: AgentState, nowMs: number): void {
    if (agent.regionIndex >= REGION_PROGRESSION.length - 1) return;
    const nextIndex = agent.regionIndex + 1;
    const nextRegion = REGION_DEFS[nextIndex];
    const current = REGION_DEFS[agent.regionIndex];
    const ratioX =
      (agent.position.x - current.bounds.minX) /
      (current.bounds.maxX - current.bounds.minX);
    agent.position.x = nextRegion.bounds.minX + ratioX * (nextRegion.bounds.maxX - nextRegion.bounds.minX);
    agent.position.y = nextRegion.bounds.maxY - 30;
    agent.regionIndex = nextIndex;
    agent.timeInRegion = 0;
    if (!agent.acrosome.activatedAtMs) {
      agent.acrosome.activatedAtMs = nowMs;
    }
  }

  getNearestEntities(entityId: number, count: number): EntityState[] {
    const target = this.agents.get(entityId);
    if (!target) return [];
    const all = Array.from(this.agents.values());
    all.sort((a, b) => {
      const da = distanceSq(a, target);
      const db = distanceSq(b, target);
      return da - db;
    });
    const picked = all.slice(0, count);
    return picked.map((agent) => this.asEntity(agent));
  }

  getEntities(): EntityState[] {
    return Array.from(this.agents.values()).map((agent) => this.asEntity(agent));
  }

  listAgents(): AgentState[] {
    return Array.from(this.agents.values()).map((agent) => ({ ...agent }));
  }

  getFinishedAgents(): AgentState[] {
    return Array.from(this.agents.values()).filter((agent) => agent.finished);
  }

  private asEntity(agent: AgentState): EntityState {
    return {
      id: agent.entityId,
      x: agent.position.x,
      y: agent.position.y,
      vx: agent.velocity.x,
      vy: agent.velocity.y,
      region: agent.regionIndex,
      capacitation: agent.capacitation,
      flags: this.computeFlags(agent),
    };
  }

  private computeFlags(agent: AgentState): number {
    let flags = 0;
    if (agent.finished) flags |= PLAYER_FLAG.FINISHED;
    if (agent.hyperTimer > 0) flags |= PLAYER_FLAG.DASHING;
    return flags;
  }

  private sampleFlow(region: RegionDefinition, position: Vector2, nowMs: number): Vector2 {
    const grid = region.flow;
    const rx = (position.x - region.bounds.minX) / (region.bounds.maxX - region.bounds.minX);
    const ry = (position.y - region.bounds.minY) / (region.bounds.maxY - region.bounds.minY);
    const gx = Math.max(0, Math.min(grid[0].length - 1.0001, rx * (grid[0].length - 1)));
    const gy = Math.max(0, Math.min(grid.length - 1.0001, ry * (grid.length - 1)));
    const x0 = Math.floor(gx);
    const x1 = Math.ceil(gx);
    const y0 = Math.floor(gy);
    const y1 = Math.ceil(gy);
    const sx = gx - x0;
    const sy = gy - y0;
    const v00 = grid[y0][x0];
    const v10 = grid[y0][x1];
    const v01 = grid[y1][x0];
    const v11 = grid[y1][x1];
    const ix0 = lerpVector(v00, v10, sx);
    const ix1 = lerpVector(v01, v11, sx);
    const base = lerpVector(ix0, ix1, sy);
    if (region.id === 'uterus') {
      const phase = Math.sin(nowMs / 850 + position.x * 0.002) * 0.5 + 0.5;
      const target = { x: 510, y: REGION_DEFS[3].bounds.maxY };
      const dir = directionTo(position, target);
      base.x += dir.x * phase * 0.6;
      base.y += dir.y * phase * 0.8;
    }
    return base;
  }
}

function lerpVector(a: Vector2, b: Vector2, t: number): Vector2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function directionTo(from: Vector2, to: Vector2): Vector2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function distanceSq(a: AgentState, b: AgentState): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  return dx * dx + dy * dy;
}
