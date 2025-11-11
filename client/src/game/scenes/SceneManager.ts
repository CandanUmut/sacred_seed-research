import type { Application, Container } from 'pixi.js';
import { Ticker } from 'pixi.js';
import type { DEFAULT_SETTINGS } from '@sperm-odyssey/shared';

export type SceneFactory = () => Scene;

export interface Scene {
  container: Container;
  update(delta: number): void;
  onResize(width: number, height: number): void;
  onEnter(previous?: string): void;
  onExit(next?: string): void;
}

export type Settings = typeof DEFAULT_SETTINGS;

export class SceneManager {
  private scenes = new Map<string, SceneFactory>();
  private activeScene?: Scene;
  private currentKey?: string;
  private ticker: Ticker;

  constructor(public readonly app: Application, public settings: Settings) {
    this.ticker = new Ticker();
    this.ticker.add((delta) => {
      this.activeScene?.update(delta);
    });
    this.ticker.start();
  }

  register(key: string, factory: SceneFactory): void {
    this.scenes.set(key, factory);
  }

  change(key: string): void {
    if (this.currentKey === key) return;
    const factory = this.scenes.get(key);
    if (!factory) throw new Error(`Unknown scene ${key}`);
    const next = factory();
    const previousKey = this.currentKey;
    if (this.activeScene) {
      this.app.stage.removeChild(this.activeScene.container);
      this.activeScene.onExit(key);
    }
    this.currentKey = key;
    this.activeScene = next;
    next.onEnter(previousKey ?? undefined);
    this.onResize(this.app.renderer.width, this.app.renderer.height);
    this.app.stage.addChild(next.container);
  }

  onResize(width: number, height: number): void {
    this.activeScene?.onResize(width, height);
  }

  get active(): Scene | undefined {
    return this.activeScene;
  }

  get settingSnapshot(): Settings {
    return this.settings;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    localStorage.setItem('sperm-odyssey-settings', JSON.stringify(this.settings));
  }

  goTo(key: string): void {
    this.change(key);
  }
}
