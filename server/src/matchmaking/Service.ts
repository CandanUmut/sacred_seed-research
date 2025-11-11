import express from 'express';
import { RoomManager } from '../rooms/RoomManager.js';

export class MatchmakingService {
  readonly router = express.Router();

  constructor(private readonly rooms: RoomManager) {
    this.router.get('/rooms', (_req, res) => {
      res.json(
        Array.from(this.rooms.list()).map((room) => ({
          id: room.id,
          players: room.getPlayerCount(),
        })),
      );
    });

    this.router.post('/rooms/reserve', (_req, res) => {
      const room = this.rooms.pickLeastLoaded();
      res.json({ roomId: room.id });
    });
  }
}
