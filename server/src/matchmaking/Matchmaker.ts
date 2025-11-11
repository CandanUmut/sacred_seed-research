import type { Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import type { JoinRoomMsg } from '@sperm-odyssey/shared';
import { logger } from '../util/logger.js';

export class Matchmaker {
  constructor(private roomManager: RoomManager) {}

  handleJoin(socket: Socket, payload: JoinRoomMsg): { roomId: string; playerId: string } {
    const { room, playerId } = this.roomManager.joinOrCreate(socket, payload.name, payload.room);
    logger.info({ room: room.id, playerId }, 'Player matched');
    return { roomId: room.id, playerId };
  }
}
