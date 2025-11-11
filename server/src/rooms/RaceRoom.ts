import type { Socket } from 'socket.io';
import {
  DEFAULT_ROOM_CONFIG,
  SNAPSHOT_RATE,
  TICK_RATE,
  type RaceSnapshot,
  type ProtocolMessage,
} from '@sperm-odyssey/shared';
import { SimWorld } from '../sim/World.js';
import { encodeMessage } from '../net/Encoding.js';
import { logger } from '../util/logger.js';

interface ClientInfo {
  socket: Socket;
  name: string;
}

export class RaceRoom {
  readonly id: string;
  private world: SimWorld;
  private clients = new Map<string, ClientInfo>();
  private tickInterval?: NodeJS.Timeout;
  private snapshotInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private finished = false;

  constructor(id: string, private seed: string = DEFAULT_ROOM_CONFIG.seed) {
    this.id = id;
    this.world = new SimWorld(seed + id);
  }

  start(): void {
    const tickMs = Math.round(1000 / TICK_RATE);
    const snapshotMs = Math.round(1000 / SNAPSHOT_RATE);
    this.tickInterval = setInterval(() => this.step(tickMs), tickMs);
    this.snapshotInterval = setInterval(() => this.broadcastSnapshot(), snapshotMs);
    logger.info({ room: this.id }, 'Race room started');
  }

  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
  }

  join(playerId: string, name: string, socket: Socket): void {
    this.clients.set(playerId, { socket, name });
    this.world.addPlayer(playerId, name);
    logger.info({ room: this.id, playerId }, 'Player joined');
  }

  leave(playerId: string): void {
    this.clients.delete(playerId);
    this.world.removePlayer(playerId);
    logger.info({ room: this.id, playerId }, 'Player left');
  }

  handleMessage(playerId: string, message: ProtocolMessage): void {
    if (message.type === 'inputs') {
      this.world.applyInputs(playerId, message.payload.frames);
    }
  }

  private step(dt: number): void {
    this.world.step(dt);
    if (!this.finished) {
      const winners = this.world.getWinners();
      if (winners.length > 0) {
        this.finished = true;
        const leaderboard = winners.slice(0, 5).map((winner) => ({
          playerId: winner.id,
          displayName: winner.name,
          timeMs: (winner.finishTick ?? 0) * dt,
        }));
        this.broadcast({
          type: 'finish',
          payload: { playerId: winners[0].id, leaderboard },
        });
      }
    }
  }

  private broadcastSnapshot(): void {
    const snapshot: RaceSnapshot = this.world.createSnapshot();
    this.broadcast({ type: 'state', payload: snapshot });
  }

  private broadcast(message: ProtocolMessage): void {
    const buffer = Buffer.from(encodeMessage(message));
    for (const { socket } of this.clients.values()) {
      socket.emit('message', buffer);
    }
  }

  getPlayerCount(): number {
    return this.world.getPlayerCount();
  }

  getStartTime(): number {
    return this.startTime;
  }
}
