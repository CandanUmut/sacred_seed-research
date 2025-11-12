import { Container, Graphics, Text } from 'pixi.js';
import type { SceneManager } from '../scenes/SceneManager.js';

const COLORBLIND_MODES = ['default', 'tritan', 'deutan', 'protan'] as const;

type Mode = (typeof COLORBLIND_MODES)[number];

export class SettingsPanel {
  container = new Container();
  private panel = new Graphics();
  private title = new Text('Settings', { fill: 0xffffff, fontSize: 26, fontWeight: 'bold' });
  private options: Text[] = [];

  constructor(private manager: SceneManager) {
    this.container.visible = false;
    this.container.addChild(this.panel, this.title);
    this.renderOptions();
  }

  private renderOptions(): void {
    const settings = this.manager.settingSnapshot;
    const labels = [
      `UI Scale: ${(settings.uiScale * 100).toFixed(0)}%`,
      `Reduced Motion: ${settings.reducedMotion ? 'On' : 'Off'}`,
      `Colorblind Mode: ${settings.colorblindMode}`,
      `Narration: ${settings.narration ? 'On' : 'Off'}`,
    ];
    this.options.forEach((text) => text.destroy());
    this.options = labels.map((label, index) => {
      const text = new Text(label, { fill: 0xe6f7ff, fontSize: 18 });
      text.position.set(0, 40 + index * 36);
      text.eventMode = 'static';
      text.cursor = 'pointer';
      text.on('pointertap', () => this.handleToggle(index));
      this.container.addChild(text);
      return text;
    });
  }

  private handleToggle(index: number): void {
    const settings = { ...this.manager.settingSnapshot };
    switch (index) {
      case 0:
        settings.uiScale = settings.uiScale >= 1.4 ? 0.8 : settings.uiScale + 0.2;
        break;
      case 1:
        settings.reducedMotion = !settings.reducedMotion;
        break;
      case 2: {
        const idx = COLORBLIND_MODES.indexOf(settings.colorblindMode as Mode);
        settings.colorblindMode = COLORBLIND_MODES[(idx + 1) % COLORBLIND_MODES.length];
        break;
      }
      case 3:
        settings.narration = !settings.narration;
        break;
      default:
        break;
    }
    this.manager.updateSettings(settings);
    this.renderOptions();
  }

  toggle(show: boolean): void {
    this.container.visible = show;
  }

  onResize(width: number, height: number): void {
    this.panel.clear();
    this.panel.beginFill(0x0b2a46, 0.95);
    this.panel.drawRoundedRect(width / 2 - 200, height / 2 - 150, 400, 280, 18);
    this.panel.endFill();
    this.panel.lineStyle(3, 0x3ea2ff);
    this.panel.drawRoundedRect(width / 2 - 200, height / 2 - 150, 400, 280, 18);
    this.panel.lineStyle(0);
    this.title.position.set(width / 2 - 160, height / 2 - 130);
    this.options.forEach((option, index) => {
      option.position.set(width / 2 - 160, height / 2 - 90 + index * 36);
    });
  }
}
