import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { Matchmaker } from './matchmaking/Matchmaker.js';
import { RoomManager } from './rooms/RoomManager.js';
import { logger } from './util/logger.js';
import { metricsRouter } from './util/metrics.js';
import { parseInputBatch, parseJoinPayload } from './net/Protocol.js';

const PORT = Number(process.env.PORT ?? 8787);

const app = express();
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.use(metricsRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket'] });

if (process.env.USE_REDIS === 'true') {
  logger.warn('Redis adapter requested but not configured; falling back to in-process rooms');
}

const roomManager = new RoomManager();
const matchmaker = new Matchmaker(roomManager);

io.on('connection', (socket) => {
  logger.info({ socket: socket.id }, 'Client connected');
  let roomId: string | null = null;
  let playerId: string | null = null;

  socket.on('joinRoom', (raw) => {
    try {
      const payload = parseJoinPayload(raw);
      const joined = matchmaker.handleJoin(socket, payload);
      roomId = joined.roomId;
      playerId = joined.playerId;
      socket.emit('joined', { roomId, playerId });
    } catch (error) {
      logger.warn({ err: error }, 'Failed to join room');
      socket.emit('error', { code: 'join-invalid', message: 'Unable to join room' });
    }
  });

  socket.on('inputs', (raw) => {
    if (!roomId || !playerId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    try {
      const frames = parseInputBatch(raw);
      room.handleInputs(playerId, frames);
    } catch (error) {
      logger.warn({ err: error }, 'Invalid input batch');
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
  logger.info({ rooms: 'heartbeat' }, 'metrics heartbeat');
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server listening');
});
