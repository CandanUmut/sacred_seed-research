import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';
import { Compendium } from '../ui/Compendium.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';

export class MenuScene implements Scene {
  container = new Container();
  private actions: Text[] = [];
  private compendium: Compendium;
  private settingsPanel: SettingsPanel;

  constructor(private manager: SceneManager) {
    const bg = new Graphics().rect(0, 0, 20, 20).fill({ color: 0x06223b });
    bg.scale.set(200);
    this.container.addChild(bg);

    const title = new Text({
      text: 'Sperm Odyssey',
      style: { fill: 0xffffff, fontSize: 48, align: 'center', fontWeight: 'bold' },
    });
    title.anchor.set(0.5);
    title.position.set(400, 120);
    this.container.addChild(title);

    const options: Array<[string, () => void]> = [
      ['Start Single Player', () => this.manager.goTo('singleplayer')],
      ['Join Multiplayer Lobby', () => this.manager.goTo('lobby')],
      ['Spectate Live Race', () => this.manager.goTo('spectate')],
      ['Open Compendium', () => this.compendium.toggle(true)],
      ['Settings', () => this.settingsPanel.toggle(true)],
    ];

    options.forEach(([label, action], idx) => {
      const text = new Text({
        text: label,
        style: { fill: 0xd4f0ff, fontSize: 28, align: 'center' },
      });
      text.anchor.set(0.5);
      text.position.set(400, 220 + idx * 60);
      text.eventMode = 'static';
      text.cursor = 'pointer';
      text.on('pointertap', action);
      text.on('pointerover', () => (text.style.fill = 0xffffff));
      text.on('pointerout', () => (text.style.fill = 0xd4f0ff));
      this.actions.push(text);
      this.container.addChild(text);
    });

    this.compendium = new Compendium();
    this.settingsPanel = new SettingsPanel(this.manager);
    this.container.addChild(this.compendium.container, this.settingsPanel.container);
  }

  update(): void {
    // static menu
  }

  onResize(width: number, height: number): void {
    this.actions.forEach((action, index) => {
      action.position.set(width / 2, height / 2 - 60 + index * 60);
    });
    this.compendium.onResize(width, height);
    this.settingsPanel.onResize(width, height);
  }

  onEnter(): void {
    this.compendium.toggle(false);
    this.settingsPanel.toggle(false);
  }

  onExit(): void {
    this.compendium.toggle(false);
    this.settingsPanel.toggle(false);
  }
}
