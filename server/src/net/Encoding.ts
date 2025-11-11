import { Encoder, Decoder } from 'msgpackr';
import type { ProtocolMessage } from '@sperm-odyssey/shared';

const encoder = new Encoder();
const decoder = new Decoder();

export function encodeMessage(message: ProtocolMessage): Uint8Array {
  return encoder.encode(message);
}

export function decodeMessage(buffer: ArrayBuffer): ProtocolMessage {
  return decoder.decode(new Uint8Array(buffer)) as ProtocolMessage;
}
