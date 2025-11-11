import type { Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager.js';
import type { ProtocolMessage } from '@sperm-odyssey/shared';
import { validateJoin } from '../net/Protocol.js';
import { logger } from '../util/logger.js';
import { encodeMessage } from '../net/Encoding.js';

export class Matchmaker {
  constructor(private roomManager: RoomManager) {}

  handleJoin(socket: Socket, message: ProtocolMessage): { roomId: string; playerId: string } | null {
    try {
      const parsed = validateJoin(message);
      const { room, playerId } = this.roomManager.joinOrCreate(socket, parsed.payload.displayName);
      logger.info({ room: room.id, playerId }, 'Player matched');
      return { roomId: room.id, playerId };
    } catch (error) {
      logger.warn({ err: error }, 'Join validation failed');
      socket.emit('message', Buffer.from(encodeMessage({
        type: 'error',
        payload: { code: 'join-invalid', message: 'Invalid join payload' },
      })));
      return null;
    }
  }
}
