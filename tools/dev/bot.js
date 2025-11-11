import { io } from 'socket.io-client';

const TICK_MS = 50;

export class Bot {
  constructor(id, url) {
    this.id = id;
    this.url = url;
    this.socket = null;
    this.tick = 0;
    this.interval = null;
    this.completed = false;
  }

  async start(durationMs = 60_000) {
    return new Promise((resolve) => {
      this.socket = io(this.url, { transports: ['websocket'], forceNew: true, reconnection: false });
      const timeout = setTimeout(() => this.stop(resolve), durationMs);
      this.socket.on('connect', () => {
        this.socket.emit('joinRoom', { name: `Bot-${this.id}` });
        this.interval = setInterval(() => this.sendRandomInput(), TICK_MS);
      });
      const cleanup = () => {
        if (this.completed) return;
        this.completed = true;
        clearInterval(this.interval);
        clearTimeout(timeout);
        this.socket?.disconnect();
        resolve();
      };
      this.socket.on('disconnect', cleanup);
      this.socket.on('finish', cleanup);
      this.socket.on('connect_error', cleanup);
    });
  }

  stop(resolve) {
    if (this.completed) return;
    this.completed = true;
    clearInterval(this.interval);
    this.socket?.disconnect();
    resolve();
  }

  sendRandomInput() {
    if (!this.socket) return;
    this.tick += 1;
    const input = {
      t: this.tick,
      u: Math.random() > 0.5,
      d: Math.random() > 0.5,
      l: Math.random() > 0.5,
      r: Math.random() > 0.5,
      ha: Math.random() > 0.9,
    };
    this.socket.emit('inputs', [input]);
  }
}
