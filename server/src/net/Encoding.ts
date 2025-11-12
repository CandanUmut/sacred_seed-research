import { Encoder, Decoder } from 'msgpackr';

const encoder = new Encoder();
const decoder = new Decoder();

export function encodeMessage<T>(message: T): Uint8Array {
  const data = encoder.encode(message);
  return data instanceof Uint8Array
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
}

export function decodeMessage<T>(buffer: ArrayBuffer | Uint8Array): T {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return decoder.decode(view) as T;
}
