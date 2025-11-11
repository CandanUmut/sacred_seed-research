import { io, type Socket } from 'socket.io-client';
import { protocolMessage, type ProtocolMessage } from '@sperm-odyssey/shared';
import { encode, decode } from 'msgpackr';

export class GameSocket {
  private socket: Socket;
  private listeners = new Set<(message: ProtocolMessage) => void>();
  private ready = false;

  constructor(url = 'http://localhost:8787') {
    this.socket = io(url, {
      transports: ['websocket'],
    });
    this.socket.on('connect', () => {
      this.ready = true;
      this.send({ type: 'hello', version: 1 });
    });
    this.socket.on('message', (payload: ArrayBuffer) => {
      const message = protocolMessage.parse(decode(new Uint8Array(payload)));
      this.listeners.forEach((listener) => listener(message));
    });
  }

  onMessage(listener: (message: ProtocolMessage) => void): void {
    this.listeners.add(listener);
  }

  offMessage(listener: (message: ProtocolMessage) => void): void {
    this.listeners.delete(listener);
  }

  send(message: ProtocolMessage): void {
    this.socket.emit('message', encode(message));
  }

  close(): void {
    this.socket.disconnect();
  }

  join(displayName: string, roomId?: string, mode: 'singleplayer' | 'multiplayer' = 'multiplayer'): void {
    if (!this.ready) {
      this.socket.once('connect', () => this.join(displayName, roomId, mode));
      return;
    }
    this.send({
      type: 'joinRoom',
      payload: {
        displayName,
        roomId,
        mode,
      },
    });
  }
}
