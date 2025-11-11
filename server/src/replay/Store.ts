import fs from 'node:fs';
import path from 'node:path';

export interface ReplayMetadata {
  id: string;
  roomId: string;
  createdAt: Date;
}

export class ReplayStore {
  private readonly dir: string;
  private readonly latestByRoom = new Map<string, string>();

  constructor() {
    this.dir = process.env.REPLAY_DIR ? path.resolve(process.env.REPLAY_DIR) : path.resolve(process.cwd(), 'replays');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(id: string, buffer: Uint8Array): Promise<ReplayMetadata> {
    const file = path.join(this.dir, `${id}.mpk`);
    await fs.promises.writeFile(file, buffer);
    const roomId = id.split(':')[0] ?? 'unknown';
    this.latestByRoom.set(roomId, id);
    return { id, roomId, createdAt: new Date() };
  }

  async load(id: string): Promise<Uint8Array | null> {
    const file = path.join(this.dir, `${id}.mpk`);
    try {
      const data = await fs.promises.readFile(file);
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  getLatest(roomId: string): string | null {
    return this.latestByRoom.get(roomId) ?? null;
  }
}
