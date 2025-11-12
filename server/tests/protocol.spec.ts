import { describe, expect, it } from '@jest/globals';
import { parseJoinPayload, parseStartPayload } from '../src/net/Protocol.js';

describe('Protocol validation', () => {
  it('parses join payload with optional room', () => {
    const payload = parseJoinPayload({ name: ' Racer ', room: 'alpha' });
    expect(payload.name).toBe('Racer');
    expect(payload.room).toBe('alpha');
  });

  it('rejects invalid join payload', () => {
    expect(() => parseJoinPayload({ name: '', room: '' })).toThrow();
  });

  it('parses start payload for host', () => {
    const payload = parseStartPayload({ room: 'room-1' });
    expect(payload.room).toBe('room-1');
  });

  it('rejects invalid start payload', () => {
    expect(() => parseStartPayload({ room: '' })).toThrow();
  });
});
