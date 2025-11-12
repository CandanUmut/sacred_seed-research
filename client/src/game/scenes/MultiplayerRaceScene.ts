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
  type Snapshot,
  type ReplaySamples,
  type LobbyMsg,
  type RosterMsg,
  type CountdownMsg,
} from '@sperm-odyssey/shared';
import { TouchControls } from '../input/Touch.js';
import { GhostLayer } from '../replay/Ghost.js';
import { unpack } from 'msgpackr';

export class MultiplayerRaceScene implements Scene {
  container = new Container();
  private background = new Graphics();
  private context: ReturnType<typeof initWorld>;
  private renderer = new RenderSystem(this);
  private hud: Hud;
  private tooltips = new Tooltips();
  private socket?: GameSocket;
  private buffer: SnapshotBuffer = {};
  private status = new Text('Connecting...', { fill: 0xffffff, fontSize: 20 });
  private inputTimer = 0;
  private localTick = 0;
  private touch?: TouchControls;
  private readonly keys = new Set<string>();
  private readonly ghostContainer = new Container<Graphics>();
  private readonly ghostLayer = new GhostLayer(this.ghostContainer);
  private currentRoomId?: string;
  private lobbyState?: LobbyMsg;
  private roster?: RosterMsg;
  private lobbyList = new Text('', { fill: 0xffffff, fontSize: 18, lineHeight: 22 });
  private startButton = new Container();
  private countdownText = new Text('', { fill: 0xffffff, fontSize: 80, fontWeight: 'bold' });
  private countdownRemainingMs = 0;
  private countdownActive = false;
  private countdownHoldMs = 0;

  constructor(private manager: SceneManager) {
    this.context = initWorld(manager.app);
    this.hud = new Hud(this.manager);
    this.container.addChild(
      this.background,
      this.ghostContainer,
      this.countdownText,
      this.lobbyList,
      this.startButton,
      this.hud.container,
      this.tooltips.container,
      this.status,
    );
    this.lobbyList.visible = false;
    this.countdownText.anchor.set(0.5);
    this.countdownText.visible = false;
    const buttonBg = new Graphics();
    buttonBg.beginFill(0x0d3555, 0.85);
    buttonBg.drawRoundedRect(-80, -24, 160, 48, 12);
    buttonBg.endFill();
    const buttonLabel = new Text('Start', { fill: 0xffffff, fontSize: 24, fontWeight: 'bold' });
    buttonLabel.anchor.set(0.5);
    this.startButton.addChild(buttonBg, buttonLabel);
    this.startButton.eventMode = 'static';
    this.startButton.cursor = 'pointer';
    this.startButton.visible = false;
    this.startButton.on('pointertap', this.onStartClick);
    Region.id[this.context.entities.player] = REGION_IDS.indexOf('vagina');
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private handleMessage = (message: { type: 'state' | 'finish'; payload: unknown }) => {
    if (message.type === 'state') {
      this.buffer.latest = message.payload as Snapshot;
      if (this.lobbyState?.state !== 'racing') {
        this.lobbyState = this.lobbyState
          ? { ...this.lobbyState, state: 'racing' }
          : { roomId: this.currentRoomId ?? '', isHost: false, state: 'racing' };
        this.updateLobbyUi();
      }
    } else if (message.type === 'finish') {
      const payload = message.payload as FinishMsg;
      const winner = payload.leaderboard.find((entry) => entry.id === payload.winner);
      const winnerName = winner?.name ?? `Player ${payload.winner}`;
      this.status.text = `Winner: ${winnerName}`;
      this.manager.goTo('postrace');
    }
  };

  update(_delta: number): void {
    this.tickCountdown(this.manager.app.ticker.deltaMS);
    if (this.buffer.latest) {
      const system = createNetClientSystem(this.buffer);
      system(this.context.world);
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
    this.lobbyList.position.set(20, 20);
    this.countdownText.position.set(width / 2, height / 2);
    this.startButton.position.set(width / 2, height * 0.75);
  }

  onEnter(): void {
    this.socket = new GameSocket();
    this.socket.onMessage(this.handleMessage);
    this.socket.onJoin(this.handleJoin);
    this.socket.onRoster(this.handleRoster);
    this.socket.onLobby(this.handleLobby);
    this.socket.onCountdown(this.handleCountdown);
    this.status.text = 'Connecting...';
    this.buffer = {};
    this.inputTimer = 0;
    this.localTick = 0;
    this.currentRoomId = undefined;
    this.lobbyState = undefined;
    this.roster = undefined;
    this.countdownActive = false;
    this.countdownHoldMs = 0;
    this.countdownText.visible = false;
    this.startButton.visible = false;
    this.lobbyList.visible = false;
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
    this.socket?.offRoster(this.handleRoster);
    this.socket?.offLobby(this.handleLobby);
    this.socket?.offCountdown(this.handleCountdown);
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

  private onStartClick = () => {
    if (this.lobbyState?.isHost && this.currentRoomId) {
      this.socket?.startRace(this.currentRoomId);
    }
  };

  private stepInputLoop(): void {
    if (!this.socket || this.lobbyState?.state !== 'racing') return;
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

  private handleRoster = (payload: RosterMsg) => {
    this.roster = payload;
    this.updateLobbyUi();
  };

  private handleLobby = (payload: LobbyMsg) => {
    this.lobbyState = payload;
    if (payload.state !== 'countdown') {
      this.countdownActive = false;
    }
    if (payload.state === 'racing') {
      this.countdownActive = false;
      this.countdownHoldMs = 0;
      this.countdownText.visible = false;
    }
    this.updateLobbyUi();
  };

  private handleCountdown = (payload: CountdownMsg) => {
    this.countdownRemainingMs = payload.fromMs;
    this.countdownHoldMs = 0;
    this.countdownActive = true;
    this.countdownText.visible = true;
    this.updateCountdownText();
  };

  private updateCountdownText(): void {
    const seconds = Math.ceil(this.countdownRemainingMs / 1000);
    this.countdownText.text = seconds > 0 ? `${seconds}` : 'Go!';
  }

  private tickCountdown(deltaMs: number): void {
    if (this.countdownActive) {
      this.countdownRemainingMs = Math.max(0, this.countdownRemainingMs - deltaMs);
      if (this.countdownRemainingMs > 0) {
        this.updateCountdownText();
      } else {
        this.countdownActive = false;
        this.countdownHoldMs = 500;
        this.countdownRemainingMs = 0;
        this.updateCountdownText();
      }
      this.countdownText.visible = true;
      return;
    }
    if (this.countdownHoldMs > 0) {
      this.countdownHoldMs = Math.max(0, this.countdownHoldMs - deltaMs);
      this.countdownText.visible = true;
      if (this.countdownHoldMs <= 0) {
        this.countdownText.visible = false;
      }
      return;
    }
    if (this.countdownText.visible) {
      this.countdownText.visible = false;
    }
  }

  private updateLobbyUi(): void {
    if (!this.lobbyState) {
      this.status.text = 'Connecting...';
      this.lobbyList.visible = false;
      this.startButton.visible = false;
      return;
    }
    const state = this.lobbyState.state;
    const isHost = this.lobbyState.isHost;
    if (state === 'waiting') {
      this.status.text = isHost ? 'You are the host. Click start when ready.' : 'Waiting for host...';
    } else if (state === 'countdown') {
      this.status.text = 'Race starting...';
    } else {
      this.status.text = 'Racing...';
    }
    const rosterLines = this.roster?.players.map((player) => {
      const isHostPlayer = this.roster?.host === player.id;
      return `${player.name}${isHostPlayer ? ' ⭐' : ''}`;
    });
    this.lobbyList.text = rosterLines && rosterLines.length > 0 ? rosterLines.join('\n') : 'Waiting for players...';
    this.lobbyList.visible = state !== 'racing';
    this.startButton.visible = Boolean(this.currentRoomId && isHost && state === 'waiting');
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
