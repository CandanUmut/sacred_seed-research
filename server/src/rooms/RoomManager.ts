import type { Socket } from 'socket.io';
import { RaceRoom } from './RaceRoom.js';
import { DEFAULT_ROOM_CONFIG } from '@sperm-odyssey/shared';
import { setRooms, setPlayers } from '../util/metrics.js';

export class RoomManager {
  private rooms = new Map<string, RaceRoom>();
  private roomCounter = 0;

  constructor(private capacity = DEFAULT_ROOM_CONFIG.capacity) {}

  createRoom(): RaceRoom {
    const id = `room-${++this.roomCounter}`;
    const room = new RaceRoom(id);
    room.start();
    this.rooms.set(id, room);
    this.updateMetrics();
    return room;
  }

  joinOrCreate(socket: Socket, name: string): { room: RaceRoom; playerId: string } {
    let room = [...this.rooms.values()].find((candidate) => candidate.getPlayerCount() < this.capacity);
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
    setRooms(this.rooms.size);
    const players = [...this.rooms.values()].reduce((total, room) => total + room.getPlayerCount(), 0);
    setPlayers(players);
  }
}
