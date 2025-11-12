import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';
import { initWorld } from '../ecs/world.js';
import { RenderSystem } from '../ecs/systems/RenderSystem.js';
import { createNetClientSystem, type SnapshotBuffer } from '../ecs/systems/NetClientSystem.js';
import { GameSocket } from '../net/socket.js';
import type { Snapshot } from '@sperm-odyssey/shared';

export class SpectateScene implements Scene {
  container = new Container();
  private background = new Graphics();
  private context: ReturnType<typeof initWorld>;
  private renderer = new RenderSystem(this);
  private socket?: GameSocket;
  private buffer: SnapshotBuffer = {};
  private status = new Text('Searching rooms...', { fill: 0xffffff, fontSize: 20 });
  private readonly snapshotListener = (snapshot: Snapshot) => {
    this.buffer.latest = snapshot as never;
  };

  constructor(private manager: SceneManager) {
    this.context = initWorld(manager.app);
    this.container.addChild(this.background, this.status);
  }

  update(): void {
    if (this.buffer.latest) {
      const system = createNetClientSystem(this.buffer);
      system(this.context.world);
      this.status.text = 'Spectating';
    }
    this.renderer.run(this.context.world);
  }

  onResize(width: number, height: number): void {
    this.background.clear();
    this.background.beginFill(0x020a12);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();
    this.status.position.set(20, height - 40);
  }

  async onEnter(): Promise<void> {
    this.buffer = {};
    this.socket = new GameSocket();
    this.socket.onSnapshot(this.snapshotListener);
    const room = await this.pickRoom();
    if (!room) {
      this.status.text = 'No active rooms to spectate';
      return;
    }
    this.socket.spectate(room.id);
    this.status.text = `Spectating ${room.id}`;
  }

  onExit(): void {
    this.socket?.offSnapshot(this.snapshotListener);
    this.socket?.close();
    this.socket = undefined;
  }

  private async pickRoom(): Promise<{ id: string } | null> {
    try {
      const response = await fetch('/matchmaking/rooms');
      if (!response.ok) return null;
      const rooms = (await response.json()) as Array<{ id: string; players: number }>;
      if (rooms.length === 0) return null;
      rooms.sort((a, b) => b.players - a.players);
      return rooms[0];
    } catch (error) {
      console.warn('Failed to fetch rooms for spectating', error);
      return null;
    }
  }
}
