import type { Socket } from 'socket.io';
import { RaceRoom } from './RaceRoom.js';
import { DEFAULT_ROOM_CONFIG } from '@sperm-odyssey/shared';
import { setRoomCount } from '../util/metrics.js';

export class RoomManager {
  private rooms = new Map<string, RaceRoom>();
  private roomCounter = 0;

  constructor(private capacity = DEFAULT_ROOM_CONFIG.capacity) {}

  createRoom(): RaceRoom {
    const id = `room-${++this.roomCounter}`;
    const room = new RaceRoom(id, DEFAULT_ROOM_CONFIG.seed);
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
      room = [...this.rooms.values()]
        .filter((candidate) => candidate.getPlayerCount() < this.capacity)
        .sort((a, b) => a.getPlayerCount() - b.getPlayerCount())[0];
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
}
