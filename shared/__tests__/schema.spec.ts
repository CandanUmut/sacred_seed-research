import { describe, expect, it } from 'vitest';
import {
  JoinRoomMsg,
  RosterMsg,
  LobbyMsg,
  CountdownMsg,
  StartRaceMsg,
  LeaveRoomMsg,
  SetReadyMsg,
} from '../src/schema.js';

describe('shared schemas', () => {
  it('sanitises join room payloads', () => {
    const parsed = JoinRoomMsg.parse({ name: '  Foobar  ', room: 'room-1' });
    expect(parsed.name).toBe('Foobar');
    expect(parsed.room).toBe('room-1');
  });

  it('validates roster payload', () => {
    const roster = RosterMsg.parse({
      roomId: 'room-1',
      host: 'a',
      players: [
        { id: 'a', name: 'Host', color: 0xffffff },
        { id: 'b', name: 'Guest', color: 0x123456 },
      ],
    });
    expect(roster.players).toHaveLength(2);
  });

  it('validates lobby message with countdown', () => {
    const lobby = LobbyMsg.parse({ roomId: 'room-1', isHost: true, state: 'countdown', countdownMs: 2500 });
    expect(lobby.countdownMs).toBe(2500);
  });

  it('validates countdown and control payloads', () => {
    const countdown = CountdownMsg.parse({ roomId: 'room-1', fromMs: 3000 });
    expect(countdown.fromMs).toBe(3000);

    expect(StartRaceMsg.parse({ room: 'room-1' }).room).toBe('room-1');
    expect(LeaveRoomMsg.parse({ room: 'room-1' }).room).toBe('room-1');
    expect(SetReadyMsg.parse({ room: 'room-1', ready: true }).ready).toBe(true);
  });
});
