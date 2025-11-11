import type { Socket } from 'socket.io';
import { RaceRoom } from './RaceRoom.js';
import { DEFAULT_ROOM_CONFIG } from '@sperm-odyssey/shared';
import { setRoomCount } from '../util/metrics.js';
import type { SeasonService } from '../db/SeasonService.js';
import { ReplayStore } from '../replay/Store.js';

export class RoomManager {
  private rooms = new Map<string, RaceRoom>();
  private roomCounter = 0;

  constructor(
    private readonly seasonService: SeasonService,
    private readonly replayStore: ReplayStore,
    private capacity = DEFAULT_ROOM_CONFIG.capacity,
  ) {}

  createRoom(): RaceRoom {
    const id = `room-${++this.roomCounter}`;
    const room = new RaceRoom(id, DEFAULT_ROOM_CONFIG.seed, this.seasonService, this.replayStore);
    room.start();
    this.rooms.set(id, room);
    this.updateMetrics();
    return room;
  }

  joinOrCreate(socket: Socket, name: string, requestedRoom?: string): { room: RaceRoom; playerId: string } {
    let room: RaceRoom | undefined;
    if (requestedRoom) {
      room = this.rooms.get(requestedRoom);
    }
    if (!room) {
      room = this.pickLeastLoaded();
    }
    if (!room) {
      room = this.createRoom();
    }
    const playerId = `${socket.id}`;
    room.join(playerId, name, socket);
    this.updateMetrics();
    return { room, playerId };
  }

  getRoom(id: string): RaceRoom | undefined {
    return this.rooms.get(id);
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.leave(playerId);
    if (room.getPlayerCount() === 0) {
      room.stop();
      this.rooms.delete(roomId);
    }
    this.updateMetrics();
  }

  private updateMetrics(): void {
    setRoomCount(this.rooms.size);
  }

  list(): Iterable<RaceRoom> {
    return this.rooms.values();
  }

  pickLeastLoaded(): RaceRoom {
    const rooms = [...this.rooms.values()].filter((candidate) => candidate.getPlayerCount() < this.capacity);
    if (rooms.length === 0) {
      return this.createRoom();
    }
    rooms.sort((a, b) => a.getPlayerCount() - b.getPlayerCount());
    return rooms[0];
  }

  addSpectator(roomId: string, socket: Socket): void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom();
    }
    room.addSpectator(socket.id, socket);
  }

  removeSpectator(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.removeSpectator(socketId);
  }
}
