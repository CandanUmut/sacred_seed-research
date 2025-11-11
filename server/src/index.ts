import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { encodeMessage, decodeMessage } from './net/Encoding.js';
import { validateMessage } from './net/Protocol.js';
import { Matchmaker } from './matchmaking/Matchmaker.js';
import { RoomManager } from './rooms/RoomManager.js';
import { logger } from './util/logger.js';
import { getMetrics } from './util/metrics.js';

const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/metrics', (_req, res) => res.json(getMetrics()));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket'] });

const roomManager = new RoomManager();
const matchmaker = new Matchmaker(roomManager);

io.on('connection', (socket) => {
  logger.info({ socket: socket.id }, 'Client connected');
  let roomId: string | null = null;
  let playerId: string | null = null;

  socket.on('message', (payload: ArrayBuffer) => {
    try {
      const message = validateMessage(decodeMessage(payload));
      if (message.type === 'joinRoom') {
        const joined = matchmaker.handleJoin(socket, message);
        if (joined) {
          roomId = joined.roomId;
          playerId = joined.playerId;
        }
        return;
      }
      if (roomId && playerId) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.handleMessage(playerId, message);
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to handle message');
      socket.emit(
        'message',
        Buffer.from(encodeMessage({ type: 'error', payload: { code: 'protocol', message: 'Invalid message' } }))
      );
    }
  });

  socket.on('disconnect', () => {
    if (roomId && playerId) {
      roomManager.removePlayer(roomId, playerId);
    }
    logger.info({ socket: socket.id }, 'Client disconnected');
  });
});

cron.schedule('*/5 * * * *', () => {
  logger.info(getMetrics(), 'metrics heartbeat');
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server listening');
});
