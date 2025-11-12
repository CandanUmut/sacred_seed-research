import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { ReplayBlob } from '@sperm-odyssey/shared';
import { Matchmaker } from './matchmaking/Matchmaker.js';
import { RoomManager } from './rooms/RoomManager.js';
import { logger } from './util/logger.js';
import { metricsRouter } from './util/metrics.js';
import { parseInputBatch, parseJoinPayload, parseSpectatePayload, parseStartPayload } from './net/Protocol.js';
import { applyRedisAdapter } from './net/RedisAdapter.js';
import { ReplayStore } from './replay/Store.js';
import { SeasonService } from './db/SeasonService.js';
import { MatchmakingService } from './matchmaking/Service.js';
import { unpack } from 'msgpackr';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8787);

async function main() {
  const app = express();
  const seasonService = new SeasonService();
  const replayStore = new ReplayStore();
  const roomManager = new RoomManager(seasonService, replayStore);
  const matchmaker = new Matchmaker(roomManager);
  const matchmakingService = new MatchmakingService(roomManager);

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use(metricsRouter);
  app.use('/matchmaking', matchmakingService.router);
  app.get('/api/seasons/current', async (_req, res) => {
    const id = await seasonService.ensureCurrentSeason();
    const season = await seasonService.getSeason(id);
    res.json(season);
  });
  app.get('/api/seasons/:id/leaderboard', async (req, res) => {
    const { id } = req.params;
    const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const ladder = await seasonService.getLeaderboard(id, Number.isNaN(limit) ? 20 : limit, Number.isNaN(offset) ? 0 : offset);
    res.json(ladder);
  });
  const replayUpload = express.raw({ type: ['application/msgpack', 'application/octet-stream'], limit: '2mb' });
  app.post('/api/replays', replayUpload, async (req, res) => {
    try {
      const body = req.body as Buffer;
      const parsed = ReplayBlob.parse(unpack(body));
      const id = `${Date.now()}:${randomUUID()}`;
      const payload = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      await replayStore.save(id, payload);
      res.status(201).json({ id, header: parsed.header });
    } catch (error) {
      logger.warn({ err: error }, 'Failed to import replay');
      res.status(400).json({ error: 'invalid-replay' });
    }
  });
  app.get('/api/replays/:id', async (req, res) => {
    const data = await replayStore.load(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'not-found' });
      return;
    }
    res.type('application/msgpack').send(data);
  });
  app.get('/api/replays/latest/:roomId', (req, res) => {
    const latest = replayStore.getLatest(req.params.roomId);
    if (!latest) {
      res.status(404).json({ error: 'not-found' });
      return;
    }
    res.json({ id: latest });
  });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' }, transports: ['websocket'] });

  await applyRedisAdapter(io);

  io.on('connection', (socket) => {
    logger.info({ socket: socket.id }, 'Client connected');
    let roomId: string | null = null;
    let playerId: string | null = null;
    let spectatorRoom: string | null = null;

    socket.on('joinRoom', (raw) => {
      try {
        const payload = parseJoinPayload(raw);
        const joined = matchmaker.handleJoin(socket, payload);
        roomId = joined.roomId;
        playerId = joined.playerId;
        if (spectatorRoom) {
          roomManager.removeSpectator(spectatorRoom, socket.id);
          spectatorRoom = null;
        }
        socket.emit('joined', { roomId, playerId });

        const room = roomManager.getRoom(roomId)!;
        const isHost = room.isHost(playerId);
        socket.emit('lobby', {
          roomId,
          isHost,
          state: room.getPhase(),
          countdownMs: room.getCountdownMs() ?? undefined,
        });
        socket.emit('roster', room.getRoster());
      } catch (err) {
        logger.warn({ err }, 'Failed to join room');
        socket.emit('error', { code: 'join-invalid', message: 'Unable to join room' });
      }
    });

    socket.on('startRace', (raw) => {
      try {
        if (!roomId || !playerId) return;
        const payload = parseStartPayload(raw);
        const room = roomManager.getRoom(payload.room);
        if (!room) return;
        room.requestStart(playerId);
      } catch (err) {
        logger.warn({ err }, 'Failed to start race');
      }
    });

    socket.on('leaveRoom', () => {
      if (!roomId || !playerId) return;
      roomManager.removePlayer(roomId, playerId);
      roomId = null;
      playerId = null;
    });

    socket.on('inputs', (raw) => {
      if (!roomId || !playerId) return;
      const room = roomManager.getRoom(roomId);
      if (!room || room.getPhase() !== 'racing') return;
      try {
        const frames = parseInputBatch(raw);
        room.handleInputs(playerId, frames);
      } catch (err) {
        logger.warn({ err }, 'Invalid input batch');
      }
    });

    socket.on('spectate', (raw) => {
      try {
        const payload = parseSpectatePayload(raw);
        spectatorRoom = payload.room;
        roomManager.addSpectator(payload.room, socket);
        socket.emit('spectating', { roomId: payload.room });
      } catch (err) {
        logger.warn({ err }, 'Failed to spectate room');
        socket.emit('error', { code: 'spectate-invalid', message: 'Unable to spectate room' });
      }
    });

    socket.on('disconnect', () => {
      if (roomId && playerId) {
        roomManager.removePlayer(roomId, playerId);
      }
      if (spectatorRoom) {
        roomManager.removeSpectator(spectatorRoom, socket.id);
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
}

void main().catch((error) => {
  logger.error({ err: error }, 'Fatal error');
  process.exit(1);
});
