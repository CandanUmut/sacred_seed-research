import { z } from 'zod';
import { InputMsg, JoinRoomMsg } from '@sperm-odyssey/shared';

const InputBatch = z.array(InputMsg).max(32);
const SpectateMsg = z.object({ room: z.string().min(1) });

export function parseJoinPayload(payload: unknown): JoinRoomMsg {
  return JoinRoomMsg.parse(payload);
}

export function parseInputBatch(payload: unknown): z.infer<typeof InputBatch> {
  return InputBatch.parse(payload);
}

export function parseSpectatePayload(payload: unknown): z.infer<typeof SpectateMsg> {
  return SpectateMsg.parse(payload);
}
