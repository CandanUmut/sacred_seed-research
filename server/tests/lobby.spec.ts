import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import type { Socket } from 'socket.io';
import { RaceRoom } from '../src/rooms/RaceRoom.js';

const noopSeasonService = {
  recordMatch: async () => {},
  ensureCurrentSeason: async () => 'season-1',
  getSeason: async () => undefined,
  getLeaderboard: async () => [],
  startSeason: async () => 'season-2',
} as const;

const noopReplayStore = {
  save: async () => ({ id: 'test:1', roomId: 'room-1', createdAt: new Date() }),
  load: async () => null,
  getLatest: () => null,
};

function createRoom(): RaceRoom {
  return new RaceRoom('room-1', 'seed', noopSeasonService as never, noopReplayStore as never);
}

function createSocket() {
  const emit = jest.fn().mockReturnValue(true);
  return { emit } as unknown as Socket & { emit: jest.Mock };
}

describe('RaceRoom lobby flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('assigns first joiner as host and transfers on leave', () => {
    const room = createRoom();
    const hostSocket = createSocket();
    const guestSocket = createSocket();
    room.join('a', 'Host', hostSocket);
    room.join('b', 'Guest', guestSocket);

    expect(room.isHost('a')).toBe(true);
    expect(room.isHost('b')).toBe(false);

    room.leave('a');

    expect(room.isHost('b')).toBe(true);
    const lobbyCalls = guestSocket.emit.mock.calls.filter(([event]) => event === 'lobby');
    expect(lobbyCalls.at(-1)?.[1]).toMatchObject({ isHost: true, roomId: 'room-1' });
    room.stop();
  });

  it('prevents non-host from starting and runs countdown for host', () => {
    const room = createRoom();
    const hostSocket = createSocket();
    const guestSocket = createSocket();
    room.join('a', 'Host', hostSocket);
    room.join('b', 'Guest', guestSocket);

    room.requestStart('b');
    expect(room.getPhase()).toBe('waiting');

    room.requestStart('a');
    expect(room.getPhase()).toBe('countdown');
    const countdownCall = hostSocket.emit.mock.calls.find(([event]) => event === 'countdown');
    expect(countdownCall?.[1]).toMatchObject({ roomId: 'room-1', fromMs: 3000 });

    jest.advanceTimersByTime(3000);

    expect(room.getPhase()).toBe('racing');
    const startCall = hostSocket.emit.mock.calls.find(([event]) => event === 'start');
    expect(startCall?.[1]).toMatchObject({ countdownMs: 0 });

    room.stop();
  });
});
