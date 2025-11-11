import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';
import { initWorld } from '../ecs/world.js';
import { RenderSystem } from '../ecs/systems/RenderSystem.js';
import { createNetClientSystem, type SnapshotBuffer } from '../ecs/systems/NetClientSystem.js';
import { GameSocket } from '../net/socket.js';
import { createRegionBackdrop } from '../maps/TileGen.js';
import { Hud } from '../ui/Hud.js';
import { Tooltips } from '../ui/Tooltips.js';
import { Player } from '../ecs/components/Player.js';
import { State } from '../ecs/components/State.js';
import { Region } from '../ecs/components/Region.js';
import { REGION_IDS, type ProtocolMessage } from '@sperm-odyssey/shared';

export class MultiplayerRaceScene implements Scene {
  container = new Container();
  private background = new Graphics();
  private context: ReturnType<typeof initWorld>;
  private renderer = new RenderSystem(this);
  private hud = new Hud(this.manager);
  private tooltips = new Tooltips();
  private socket?: GameSocket;
  private buffer: SnapshotBuffer = {};
  private status = new Text({ text: 'Connecting...', style: { fill: 0xffffff, fontSize: 20 } });

  constructor(private manager: SceneManager) {
    this.context = initWorld(manager.app);
    this.container.addChild(this.background, this.hud.container, this.tooltips.container, this.status);
    Region.id[this.context.entities.player] = REGION_IDS.indexOf('vagina');
  }

  private handleMessage = (message: ProtocolMessage) => {
    if (message.type === 'state') {
      this.buffer.latest = message.payload;
    } else if (message.type === 'finish') {
      this.status.text = `Winner: ${message.payload.playerId}`;
      this.manager.goTo('postrace');
    }
  };

  update(): void {
    if (this.buffer.latest) {
      const system = createNetClientSystem(this.buffer);
      system(this.context.world);
      this.status.text = 'Racing...';
    }
    this.renderer.run(this.context.world);
    const eid = this.context.entities.player;
    this.hud.update(Player.stamina[eid], Player.capacitation[eid], State.progress[eid]);
    this.tooltips.show({
      title: 'Multiplayer Race',
      description: 'Server-authoritative snapshots keep everyone synchronized. Slipstream to gain speed!',
    });
  }

  onResize(width: number, height: number): void {
    createRegionBackdrop(this.manager.app, this.background);
    this.hud.onResize(width, height);
    this.tooltips.onResize(width, height);
    this.status.position.set(20, height - 60);
  }

  onEnter(): void {
    this.socket = new GameSocket();
    this.socket.onMessage(this.handleMessage);
    this.status.text = 'Connecting...';
    this.buffer = {};
    const storedName = localStorage.getItem('sperm-odyssey-name');
    const displayName = storedName ?? `Explorer-${Math.floor(Math.random() * 999)}`;
    if (!storedName) {
      localStorage.setItem('sperm-odyssey-name', displayName);
    }
    this.socket.join(displayName);
  }

  onExit(): void {
    this.socket?.offMessage(this.handleMessage);
    this.socket?.close();
  }
}
