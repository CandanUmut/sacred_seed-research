import { describe, expect, it } from 'vitest';
import {
  ChatMsg,
  InputMsg,
  JoinRoomMsg,
  Snapshot,
  decodeSnapshot,
  encodeSnapshot,
  packEntity,
  unpackEntity,
} from '../src/schema.js';
import { REGION_PROGRESSION } from '../src/constants.js';

describe('shared schema', () => {
  it('sanitizes join names', () => {
    const parsed = JoinRoomMsg.parse({ room: 'amphitheatre', name: '  BadWord1 Hero  ' });
    expect(parsed.name).toBe('*** Hero');
  });

  it('validates player input payloads', () => {
    const payload = InputMsg.parse({ t: 10, u: true, d: false, l: false, r: true, ha: false });
    expect(payload).toMatchObject({ t: 10, r: true });
    expect(() => InputMsg.parse({})).toThrow();
  });

  it('encodes and decodes snapshots deterministically', () => {
    const snapshot = Snapshot.parse({
      sTick: 12,
      you: 5,
      ents: [
        packEntity({
          id: 5,
          x: 12.5,
          y: -6.25,
          vx: 1.2,
          vy: -0.5,
          region: REGION_PROGRESSION.indexOf('cervix'),
          capacitation: 0.42,
          flags: 3,
        }),
      ],
    });
    const buffer = encodeSnapshot(snapshot);
    const decoded = decodeSnapshot(buffer);
    expect(decoded.you).toBe(5);
    expect(decoded.ents).toHaveLength(1);
    const entity = unpackEntity(decoded.ents[0]);
    expect(entity.capacitation).toBeCloseTo(0.42, 2);
  });

  it('bounds chat messages', () => {
    expect(() => ChatMsg.parse({ text: 'Friendly hello!' })).not.toThrow();
    expect(() => ChatMsg.parse({ text: 'x'.repeat(500) })).toThrow();
  });
});
