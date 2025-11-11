import { z } from 'zod';
import { InputMsg, JoinRoomMsg } from '@sperm-odyssey/shared';

const InputBatch = z.array(InputMsg).max(32);

export function parseJoinPayload(payload: unknown): JoinRoomMsg {
  return JoinRoomMsg.parse(payload);
}

export function parseInputBatch(payload: unknown): z.infer<typeof InputBatch> {
  return InputBatch.parse(payload);
}
