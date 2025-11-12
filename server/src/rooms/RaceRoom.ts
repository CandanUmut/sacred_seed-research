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
  type StartMsg,
} from '@sperm-odyssey/shared';
import { randomUUID } from 'node:crypto';
import { SimWorld } from '../sim/World.js';
import { logger } from '../util/logger.js';
import {
  addSnapshots,
  observeTickDuration,
  recordBytesOut,
  setPlayers,
} from '../util/metrics.js';
import { Recorder } from '../replay/Recorder.js';
import type { SeasonService } from '../db/SeasonService.js';
import { ReplayStore } from '../replay/Store.js';

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
  private readonly seed: string;
  private readonly players = new Map<string, PlayerSession>();
  private readonly playerColors = new Map<string, number>();
  private tickHandle?: NodeJS.Timeout;
  private snapshotHandle?: NodeJS.Timeout;
  private serverTick = 0;
  private finished = false;
  private leaderboard: LeaderboardEntry[] = [];
  private hostSessionId: string | null = null;
  private phase: 'lobby' | 'countdown' | 'racing' | 'finished' = 'lobby';
  private joinOrder: string[] = [];
  private countdownHandle?: NodeJS.Timeout;
  private countdownEndsAt: number | null = null;
  private countdownDuration = 0;

  private readonly recorder: Recorder;
  private readonly replayStore: ReplayStore;
  private readonly startedAt: Date;
  private readonly spectators = new Map<string, Socket>();

  constructor(
    id: string,
    seed: string,
    private readonly seasonService: SeasonService,
    replayStore: ReplayStore,
  ) {
    this.id = id;
    this.seed = seed;
    this.world = new SimWorld(`${seed}:${id}`);
    this.replayStore = replayStore;
    this.startedAt = new Date();
    this.recorder = new Recorder({
      version: 1,
      seed: hashSeed(seed),
      worldHash: 'SimWorld:v1',
      startedAt: Math.round(this.startedAt.getTime()),
    });
  }

  start(): void {}

  stop(): void {
    this.resetPhase();
    this.players.clear();
    this.spectators.clear();
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
    this.playerColors.set(sessionId, colorFromName(name));
    if (!this.hostSessionId) {
      this.hostSessionId = sessionId;
    }
    this.joinOrder.push(sessionId);
    this.broadcastRoster();
    this.broadcastLobbyState();
    if (this.phase === 'countdown') {
      socket.emit('countdown', {
        roomId: this.id,
        fromMs: this.getCountdownMs() ?? this.countdownDuration,
      });
    }
    logger.info({ room: this.id, sessionId, entityId: agent.entityId }, 'Player joined room');
    setPlayers(this.id, this.players.size);
    return player;
  }

  leave(sessionId: string): void {
    this.players.delete(sessionId);
    this.world.removePlayer(sessionId);
    this.playerColors.delete(sessionId);
    this.joinOrder = this.joinOrder.filter((id) => id !== sessionId);
    if (this.hostSessionId === sessionId) {
      this.hostSessionId = this.joinOrder.find((id) => this.players.has(id)) ?? null;
    }
    if (this.players.size === 0) {
      this.resetPhase();
    }
    this.broadcastRoster();
    this.broadcastLobbyState();
    logger.info({ room: this.id, sessionId }, 'Player left room');
    setPlayers(this.id, this.players.size);
  }

  requestStart(sessionId: string): void {
    if (this.phase !== 'lobby') return;
    if (this.hostSessionId !== sessionId) return;
    if (this.players.size === 0) return;
    this.phase = 'countdown';
    this.countdownDuration = 3_000;
    this.countdownEndsAt = Date.now() + this.countdownDuration;
    this.broadcastLobbyState();
    this.broadcastCountdown(this.countdownDuration);
    if (this.countdownHandle) clearTimeout(this.countdownHandle);
    const handle = setTimeout(() => {
      this.beginRace();
    }, this.countdownDuration);
    if (typeof handle.unref === 'function') handle.unref();
    this.countdownHandle = handle;
  }

  addSpectator(sessionId: string, socket: Socket): void {
    this.spectators.set(sessionId, socket);
    socket.emit('spectate:start', { roomId: this.id, tick: this.serverTick });
  }

  removeSpectator(sessionId: string): void {
    this.spectators.delete(sessionId);
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getPhase(): 'waiting' | 'countdown' | 'racing' {
    if (this.phase === 'lobby') return 'waiting';
    if (this.phase === 'countdown') return 'countdown';
    return 'racing';
  }

  getCountdownMs(): number | null {
    if (this.phase !== 'countdown' || this.countdownEndsAt === null) return null;
    return Math.max(0, this.countdownEndsAt - Date.now());
  }

  isHost(sessionId: string): boolean {
    return this.hostSessionId === sessionId;
  }

  getRoster(): { roomId: string; host: string; players: Array<{ id: string; name: string; color: number }> } {
    return {
      roomId: this.id,
      host: this.hostSessionId ?? '',
      players: [...this.players.entries()].map(([id, player]) => ({
        id,
        name: player.name,
        color: this.playerColors.get(id) ?? colorFromName(player.name),
      })),
    };
  }

  handleInputs(sessionId: string, frames: InputMsg[]): void {
    if (this.phase !== 'racing') return;
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
      this.recorder.addInput({
        t: frame.t,
        id: player.entityId,
        u: frame.u,
        d: frame.d,
        l: frame.l,
        r: frame.r,
        ha: frame.ha,
      });
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
        this.phase = 'finished';
        for (const { socket } of this.players.values()) {
          socket.emit('finish', payload);
        }
        this.broadcastLobbyState();
        void this.persistResults();
      }
    }
  }

  private broadcastSnapshot(): void {
    if (this.phase !== 'racing') return;
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
    if (this.spectators.size > 0 && this.serverTick % 8 === 0) {
      const ents = this.world.getEntities().map((e) =>
        packEntity({
          id: e.id,
          x: e.x,
          y: e.y,
          vx: e.vx,
          vy: e.vy,
          region: e.region,
          capacitation: e.capacitation,
          flags: e.flags,
        }),
      );
      const snapshot: Snapshot = { sTick: this.serverTick, you: -1, ents };
      const buffer = encodeSnapshot(snapshot);
      for (const socket of this.spectators.values()) {
        socket.emit('state', buffer);
        recordBytesOut(this.id, -1, buffer.length);
      }
    }
  }

  private persistResults(): void {
    const finishers = this.world.getFinishedAgents();
    const participants = finishers.map((agent, index) => ({
      playerId: agent.sessionId,
      name: agent.name,
      place: index + 1,
      timeMs: (agent.finishTick ?? this.serverTick) * TICK_MS,
    }));
    const dnfs = [...this.players.entries()]
      .filter(([sessionId]) => !finishers.some((agent) => agent.sessionId === sessionId))
      .map(([sessionId, player], idx) => ({
        playerId: sessionId,
        name: player.name,
        place: finishers.length + idx + 1,
        timeMs: this.serverTick * TICK_MS,
      }));
    const results = [...participants, ...dnfs];
    const buffer = this.recorder.toBuffer();
    const replayId = `${this.id}:${randomUUID()}`;
    void this.replayStore.save(replayId, buffer).catch((error) => {
      logger.error({ err: error }, 'Failed to save replay');
    });
    void this.seasonService
      .recordMatch({
        roomId: this.id,
        seed: this.worldSeed(),
        startedAt: this.startedAt,
        finishedAt: new Date(),
        participants: results,
      })
      .catch((error) => logger.error({ err: error }, 'Failed to record match result'));
  }

  private worldSeed(): string {
    return this.seed;
  }

  private beginRace(): void {
    if (this.phase !== 'countdown') return;
    this.phase = 'racing';
    this.countdownEndsAt = null;
    this.countdownHandle = undefined;
    const tickHandle = setInterval(() => this.step(), TICK_MS);
    if (typeof tickHandle.unref === 'function') tickHandle.unref();
    this.tickHandle = tickHandle;
    const snapshotHandle = setInterval(() => this.broadcastSnapshot(), SNAPSHOT_MS);
    if (typeof snapshotHandle.unref === 'function') snapshotHandle.unref();
    this.snapshotHandle = snapshotHandle;
    this.broadcastLobbyState();
    const payload = { tick: this.serverTick, countdownMs: 0 } satisfies StartMsg;
    for (const { socket } of this.players.values()) {
      socket.emit('start', payload);
    }
  }

  public broadcastRoster(): void {
    const payload = this.getRoster();
    for (const { socket } of this.players.values()) {
      socket.emit('roster', payload);
    }
  }

  private broadcastCountdown(fromMs: number): void {
    const payload = { roomId: this.id, fromMs };
    for (const { socket } of this.players.values()) {
      socket.emit('countdown', payload);
    }
  }

  private broadcastLobbyState(): void {
    for (const [sessionId, player] of this.players) {
      const payload = {
        roomId: this.id,
        isHost: this.isHost(sessionId),
        state: this.getPhase(),
        countdownMs: this.getCountdownMs() ?? undefined,
      };
      player.socket.emit('lobby', payload);
    }
  }

  private resetPhase(): void {
    if (this.countdownHandle) {
      clearTimeout(this.countdownHandle);
      this.countdownHandle = undefined;
    }
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = undefined;
    }
    if (this.snapshotHandle) {
      clearInterval(this.snapshotHandle);
      this.snapshotHandle = undefined;
    }
    this.phase = 'lobby';
    this.countdownEndsAt = null;
    this.countdownDuration = 0;
    this.serverTick = 0;
    this.finished = false;
    this.hostSessionId = null;
    this.joinOrder = [];
    this.playerColors.clear();
  }
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function colorFromName(name: string): number {
  const hash = hashSeed(name);
  const r = 0x40 + (hash & 0x3f);
  const g = 0x80 + ((hash >> 6) & 0x7f);
  const b = 0x40 + ((hash >> 13) & 0x3f);
  return (r << 16) | (g << 8) | b;
}
