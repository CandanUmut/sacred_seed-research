import type { Socket } from 'socket.io';
import { performance } from 'node:perf_hooks';
import {
  INTEREST_NEAREST,
  SNAPSHOT_MS,
  TICK_MS,
  TICK_RATE,
} from '@sperm-odyssey/shared';
import {
  encodeSnapshot,
  packEntity,
  type FinishMsg,
  type InputMsg,
  type Snapshot,
} from '@sperm-odyssey/shared';
import { SimWorld } from '../sim/World.js';
import { logger } from '../util/logger.js';
import {
  addSnapshots,
  observeTickDuration,
  recordBytesOut,
  setPlayers,
} from '../util/metrics.js';

interface PlayerSession {
  socket: Socket;
  entityId: number;
  name: string;
  lastInputTick: number;
  lastInputAt: number;
  slowMode: boolean;
}

interface LeaderboardEntry {
  id: number;
  name: string;
  finishTick: number;
}

export class RaceRoom {
  readonly id: string;
  private readonly world: SimWorld;
  private readonly players = new Map<string, PlayerSession>();
  private tickHandle?: NodeJS.Timeout;
  private snapshotHandle?: NodeJS.Timeout;
  private serverTick = 0;
  private finished = false;
  private leaderboard: LeaderboardEntry[] = [];

  constructor(id: string, seed: string) {
    this.id = id;
    this.world = new SimWorld(`${seed}:${id}`);
  }

  start(): void {
    logger.info({ room: this.id }, 'Starting race room');
    this.tickHandle = setInterval(() => this.step(), TICK_MS);
    this.snapshotHandle = setInterval(() => this.broadcastSnapshot(), SNAPSHOT_MS);
  }

  stop(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    if (this.snapshotHandle) clearInterval(this.snapshotHandle);
    this.players.clear();
  }

  join(sessionId: string, name: string, socket: Socket): PlayerSession {
    const agent = this.world.addPlayer(sessionId, name);
    const player: PlayerSession = {
      socket,
      entityId: agent.entityId,
      name,
      lastInputTick: 0,
      lastInputAt: Date.now(),
      slowMode: false,
    };
    this.players.set(sessionId, player);
    socket.emit('start', { tick: this.serverTick, countdownMs: 3_000 });
    logger.info({ room: this.id, sessionId, entityId: agent.entityId }, 'Player joined room');
    setPlayers(this.id, this.players.size);
    return player;
  }

  leave(sessionId: string): void {
    this.players.delete(sessionId);
    this.world.removePlayer(sessionId);
    logger.info({ room: this.id, sessionId }, 'Player left room');
    setPlayers(this.id, this.players.size);
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  handleInputs(sessionId: string, frames: InputMsg[]): void {
    const player = this.players.get(sessionId);
    if (!player) return;
    const now = Date.now();
    const cappedFrames = frames.slice(-12);
    for (const frame of cappedFrames) {
      if (frame.t <= player.lastInputTick) continue;
      const deltaTick = frame.t - player.lastInputTick;
      if (deltaTick > TICK_RATE * 0.5) continue;
      if (now - player.lastInputAt < 1000 / 30) continue;
      player.lastInputTick = frame.t;
      player.lastInputAt = now;
      this.world.queueInput(sessionId, frame);
    }
  }

  private step(): void {
    const start = performance.now();
    this.serverTick += 1;
    this.world.step(TICK_MS);
    observeTickDuration(performance.now() - start);
    if (this.serverTick % (TICK_RATE * 5) === 0) {
      logger.info({ room: this.id, tick: this.serverTick, players: this.players.size }, 'room heartbeat');
    }
    if (!this.finished) {
      const finishers = this.world.getFinishedAgents();
      if (finishers.length > 0) {
        this.finished = true;
        this.leaderboard = finishers
          .map((agent) => ({
            id: agent.entityId,
            name: agent.name,
            finishTick: agent.finishTick ?? this.serverTick,
          }))
          .sort((a, b) => a.finishTick - b.finishTick);
        const payload: FinishMsg = {
          winner: this.leaderboard[0].id,
          leaderboard: this.leaderboard.map((entry) => ({
            id: entry.id,
            name: entry.name,
            timeMs: entry.finishTick * TICK_MS,
          })),
        };
        for (const { socket } of this.players.values()) {
          socket.emit('finish', payload);
        }
      }
    }
  }

  private broadcastSnapshot(): void {
    for (const [sessionId, p] of this.players) {
      const interestCount = p.slowMode ? Math.max(8, Math.floor(INTEREST_NEAREST / 2)) : INTEREST_NEAREST;
      const near = this.world.getNearestEntities(p.entityId, interestCount);
      const ents = near.map((e) => packEntity({
        id: e.id,
        x: e.x,
        y: e.y,
        vx: e.vx,
        vy: e.vy,
        region: e.region,
        capacitation: e.capacitation,
        flags: e.flags,
      }));
      const snapshot: Snapshot = { sTick: this.serverTick, you: p.entityId, ents };
      const buffer = encodeSnapshot(snapshot);
      p.socket.emit('state', buffer);
      recordBytesOut(this.id, p.entityId, buffer.length);
      addSnapshots(ents.length);
      if (this.serverTick - p.lastInputTick > (p.slowMode ? 40 : 12)) {
        p.slowMode = true;
        if (this.serverTick - p.lastInputTick > TICK_RATE * 6) {
          logger.warn({ room: this.id, entityId: p.entityId }, 'Kicking slow client due to desync');
          p.socket.emit('error', { code: 'desync', message: 'Connection too far behind' });
          p.socket.disconnect(true);
          this.leave(sessionId);
          continue;
        }
      } else if (p.slowMode && this.serverTick - p.lastInputTick < 6) {
        p.slowMode = false;
      }
    }
  }
}
