import { describe, expect, it } from 'vitest';
import {
  helloMessage,
  joinRoomMessage,
  inputMessage,
  stateMessage,
  raceSnapshotSchema,
} from '../src/schema.js';
import { REGION_PROGRESSION } from '../src/constants.js';

const basePlayer = {
  id: 'p1',
  name: 'Learner',
  region: REGION_PROGRESSION[0],
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  stamina: 50,
  capacitation: 10,
  hyperactive: false,
  effects: [],
  finished: false,
  progress: 0,
};

describe('shared schemas', () => {
  it('validates hello message', () => {
    expect(() => helloMessage.parse({ type: 'hello', version: 1 })).not.toThrow();
  });

  it('rejects invalid join', () => {
    expect(() => joinRoomMessage.parse({ type: 'joinRoom', payload: { displayName: '', mode: 'singleplayer' } })).toThrow();
  });

  it('accepts valid snapshot', () => {
    const snapshot = raceSnapshotSchema.parse({
      tick: 5,
      players: [basePlayer],
      worldSeed: 'seed',
      region: REGION_PROGRESSION[0],
    });
    expect(snapshot.players[0].name).toBe('Learner');
  });

  it('validates input frames', () => {
    const parsed = inputMessage.parse({
      type: 'inputs',
      payload: { frames: [{ tick: 1, direction: { x: 0, y: 1 }, hyperactivate: false }] },
    });
    expect(parsed.payload.frames).toHaveLength(1);
  });

  it('rejects invalid state message', () => {
    expect(() => stateMessage.parse({ type: 'state', payload: {} })).toThrow();
  });
});
