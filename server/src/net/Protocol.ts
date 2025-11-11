import { protocolMessage, joinRoomMessage, inputMessage } from '@sperm-odyssey/shared';
import type { ProtocolMessage } from '@sperm-odyssey/shared';

export function validateMessage(message: unknown): ProtocolMessage {
  return protocolMessage.parse(message);
}

export function validateJoin(message: ProtocolMessage): ReturnType<typeof joinRoomMessage['parse']> {
  if (message.type !== 'joinRoom') throw new Error('Expected joinRoom');
  return joinRoomMessage.parse(message);
}

export function validateInputs(message: ProtocolMessage): ReturnType<typeof inputMessage['parse']> {
  if (message.type !== 'inputs') throw new Error('Expected inputs');
  return inputMessage.parse(message);
}
