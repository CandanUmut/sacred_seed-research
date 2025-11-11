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
import {
  REGION_IDS,
  TICK_MS,
  ReplaySamples as ReplaySamplesSchema,
  type InputMsg,
  type FinishMsg,
  type ReplaySamples,
} from '@sperm-odyssey/shared';
import { TouchControls } from '../input/Touch.js';
import { GhostLayer } from '../replay/Ghost.js';
import { unpack } from 'msgpackr';

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
  private inputTimer = 0;
  private localTick = 0;
  private touch?: TouchControls;
  private readonly keys = new Set<string>();
  private readonly ghostContainer = new Container();
  private readonly ghostLayer = new GhostLayer(this.ghostContainer);
  private currentRoomId?: string;

  constructor(private manager: SceneManager) {
    this.context = initWorld(manager.app);
    this.container.addChild(
      this.background,
      this.ghostContainer,
      this.hud.container,
      this.tooltips.container,
      this.status,
    );
    Region.id[this.context.entities.player] = REGION_IDS.indexOf('vagina');
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private handleMessage = (message: { type: 'state' | 'finish'; payload: unknown }) => {
    if (message.type === 'state') {
      this.buffer.latest = message.payload as never;
    } else if (message.type === 'finish') {
      const payload = message.payload as FinishMsg;
      this.status.text = `Winner: ${payload.playerId}`;
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
    this.stepInputLoop();
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
    this.socket.onJoin(this.handleJoin);
    this.status.text = 'Connecting...';
    this.buffer = {};
    this.inputTimer = 0;
    this.localTick = 0;
    this.currentRoomId = undefined;
    this.ghostLayer.clear();
    const storedName = localStorage.getItem('sperm-odyssey-name');
    const displayName = storedName ?? `Explorer-${Math.floor(Math.random() * 999)}`;
    if (!storedName) {
      localStorage.setItem('sperm-odyssey-name', displayName);
    }
    this.socket.join(displayName);
    if (navigator.maxTouchPoints > 0) {
      this.touch = new TouchControls();
      this.touch.onPerformanceToggle(() => {
        const next = !this.manager.settingSnapshot.reducedMotion;
        this.manager.updateSettings({ reducedMotion: next });
      });
    }
  }

  onExit(): void {
    this.socket?.offMessage(this.handleMessage);
    this.socket?.offJoin(this.handleJoin);
    this.socket?.close();
    this.touch?.destroy();
    this.touch = undefined;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.key.toLowerCase());
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private stepInputLoop(): void {
    if (!this.socket) return;
    this.inputTimer += this.manager.app.ticker.deltaMS;
    while (this.inputTimer >= TICK_MS) {
      this.inputTimer -= TICK_MS;
      this.localTick += 1;
      const frame = this.buildInputFrame(this.localTick);
      this.socket.sendInputs([frame]);
    }
  }

  private buildInputFrame(tick: number): InputMsg {
    const touchState = this.touch?.getState() ?? { u: false, d: false, l: false, r: false, ha: false };
    const up = touchState.u || this.keys.has('w') || this.keys.has('arrowup');
    const down = touchState.d || this.keys.has('s') || this.keys.has('arrowdown');
    const left = touchState.l || this.keys.has('a') || this.keys.has('arrowleft');
    const right = touchState.r || this.keys.has('d') || this.keys.has('arrowright');
    const hyper = touchState.ha || this.keys.has(' ');
    return { t: tick, u: up, d: down, l: left, r: right, ha: hyper };
  }

  private handleJoin = (payload: { roomId: string; playerId: string }) => {
    this.currentRoomId = payload.roomId;
    void this.loadGhost(payload.roomId);
  };

  private async loadGhost(roomId: string): Promise<void> {
    try {
      const latestResponse = await fetch(`/api/replays/latest/${roomId}`);
      if (!latestResponse.ok) {
        this.ghostLayer.clear();
        return;
      }
      const { id } = (await latestResponse.json()) as { id: string };
      const replayResponse = await fetch(`/api/replays/${id}`);
      if (!replayResponse.ok) return;
      const arrayBuffer = await replayResponse.arrayBuffer();
      const parsed = ReplaySamplesSchema.parse(unpack(new Uint8Array(arrayBuffer))) as ReplaySamples;
      this.ghostLayer.load(parsed);
    } catch (error) {
      console.warn('Failed to load ghost replay', error);
    }
  }
}
