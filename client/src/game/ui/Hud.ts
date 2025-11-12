import { Container, Graphics, Text } from 'pixi.js';
import type { SceneManager } from '../scenes/SceneManager.js';
import { REGION_SEGMENTS } from '../maps/Regions.js';

export class Hud {
  container = new Container();
  private staminaBar = new Graphics();
  private capacitationBar = new Graphics();
  private regionLabel = new Text('', { fill: 0xffffff, fontSize: 18 });

  constructor(private manager: SceneManager) {
    this.container.addChild(this.staminaBar, this.capacitationBar, this.regionLabel);
  }

  update(stamina: number, capacitation: number, progress: number): void {
    this.staminaBar.clear();
    this.capacitationBar.clear();

    this.staminaBar.lineStyle(2, 0xffffff, 1);
    this.staminaBar.drawRect(20, 20, 220, 18);
    this.staminaBar.lineStyle(0);
    this.staminaBar.beginFill(0x8ae6ff);
    this.staminaBar.drawRect(20, 20, 220 * (stamina / 100), 18);
    this.staminaBar.endFill();

    this.capacitationBar.lineStyle(2, 0xffffff, 1);
    this.capacitationBar.drawRect(20, 50, 220, 18);
    this.capacitationBar.lineStyle(0);
    this.capacitationBar.beginFill(0xffd166);
    this.capacitationBar.drawRect(20, 50, 220 * (capacitation / 100), 18);
    this.capacitationBar.endFill();

    const region = REGION_SEGMENTS[Math.floor(progress * REGION_SEGMENTS.length)] ?? REGION_SEGMENTS.at(-1);
    this.regionLabel.text = region ? `Region: ${region.label}` : 'Region: ???';
  }

  onResize(width: number, height: number): void {
    this.container.position.set(0, 0);
    this.regionLabel.position.set(20, height - 40);
  }
}
