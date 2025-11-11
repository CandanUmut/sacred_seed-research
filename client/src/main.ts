import { Application } from 'pixi.js';
import { DEFAULT_SETTINGS } from '@sperm-odyssey/shared';
import { BootScene } from './game/scenes/BootScene.js';
import { MenuScene } from './game/scenes/MenuScene.js';
import { SinglePlayerScene } from './game/scenes/SinglePlayerScene.js';
import { MultiplayerRaceScene } from './game/scenes/MultiplayerRaceScene.js';
import { PostRaceScene } from './game/scenes/PostRaceScene.js';
import { LobbyScene } from './game/scenes/LobbyScene.js';
import { SpectateScene } from './game/scenes/SpectateScene.js';
import { SceneManager } from './game/scenes/SceneManager.js';
import './styles/ui.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing root container');
}

const app = new Application();
let sceneManager: SceneManager;

async function bootstrap(): Promise<void> {
  await app.init({
    background: '#02111d',
    resizeTo: window,
    antialias: true,
  });
  root.appendChild(app.canvas);

  const storedSettings = localStorage.getItem('sperm-odyssey-settings');
  const settings = storedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) } : DEFAULT_SETTINGS;

  sceneManager = new SceneManager(app, settings);
  sceneManager.register('boot', () => new BootScene(sceneManager));
  sceneManager.register('menu', () => new MenuScene(sceneManager));
  sceneManager.register('lobby', () => new LobbyScene(sceneManager));
  sceneManager.register('singleplayer', () => new SinglePlayerScene(sceneManager));
  sceneManager.register('multiplayer', () => new MultiplayerRaceScene(sceneManager));
  sceneManager.register('spectate', () => new SpectateScene(sceneManager));
  sceneManager.register('postrace', () => new PostRaceScene(sceneManager));

  sceneManager.change('boot');

  window.addEventListener('resize', () => sceneManager.onResize(window.innerWidth, window.innerHeight));

  if ('wakeLock' in navigator) {
    // Keep screen awake during races if supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).wakeLock?.request?.('screen').catch(() => {
      // ignore
    });
  }
}

void bootstrap();

export type Settings = typeof DEFAULT_SETTINGS;
