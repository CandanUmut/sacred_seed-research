import { io, type Socket } from 'socket.io-client';
import {
  decodeSnapshot,
  type InputMsg,
  type Snapshot,
  type StartMsg,
  type FinishMsg,
} from '@sperm-odyssey/shared';

export class GameSocket {
  private socket: Socket;
  private snapshotListeners = new Set<(snapshot: Snapshot) => void>();
  private startListeners = new Set<(payload: StartMsg) => void>();
  private finishListeners = new Set<(payload: FinishMsg) => void>();
  private joinListeners = new Set<(payload: { roomId: string; playerId: string }) => void>();
  private messageListeners = new Set<(message: { type: 'state' | 'finish'; payload: unknown }) => void>();

  constructor(url = 'http://localhost:8787') {
    this.socket = io(url, { transports: ['websocket'] });
    this.socket.on('state', (payload: ArrayBuffer) => {
      const snapshot = decodeSnapshot(new Uint8Array(payload));
      for (const listener of this.snapshotListeners) listener(snapshot);
      for (const listener of this.messageListeners) listener({ type: 'state', payload: snapshot });
    });
    this.socket.on('start', (payload: StartMsg) => {
      for (const listener of this.startListeners) listener(payload);
    });
    this.socket.on('finish', (payload: FinishMsg) => {
      for (const listener of this.finishListeners) listener(payload);
      for (const listener of this.messageListeners) listener({ type: 'finish', payload });
    });
    this.socket.on('joined', (payload: { roomId: string; playerId: string }) => {
      for (const listener of this.joinListeners) listener(payload);
    });
  }

  join(name: string, room?: string): void {
    this.socket.emit('joinRoom', { name, room });
  }

  spectate(room: string): void {
    this.socket.emit('spectate', { room });
  }

  sendInputs(frames: InputMsg[]): void {
    if (frames.length === 0) return;
    this.socket.emit('inputs', frames);
  }

  onSnapshot(listener: (snapshot: Snapshot) => void): void {
    this.snapshotListeners.add(listener);
  }

  offSnapshot(listener: (snapshot: Snapshot) => void): void {
    this.snapshotListeners.delete(listener);
  }

  onStart(listener: (payload: StartMsg) => void): void {
    this.startListeners.add(listener);
  }

  offStart(listener: (payload: StartMsg) => void): void {
    this.startListeners.delete(listener);
  }

  onFinish(listener: (payload: FinishMsg) => void): void {
    this.finishListeners.add(listener);
  }

  offFinish(listener: (payload: FinishMsg) => void): void {
    this.finishListeners.delete(listener);
  }

  onJoin(listener: (payload: { roomId: string; playerId: string }) => void): void {
    this.joinListeners.add(listener);
  }

  offJoin(listener: (payload: { roomId: string; playerId: string }) => void): void {
    this.joinListeners.delete(listener);
  }

  onMessage(listener: (message: { type: 'state' | 'finish'; payload: unknown }) => void): void {
    this.messageListeners.add(listener);
  }

  offMessage(listener: (message: { type: 'state' | 'finish'; payload: unknown }) => void): void {
    this.messageListeners.delete(listener);
  }

  close(): void {
    this.socket.disconnect();
    this.snapshotListeners.clear();
    this.startListeners.clear();
    this.finishListeners.clear();
    this.joinListeners.clear();
    this.messageListeners.clear();
  }
}
