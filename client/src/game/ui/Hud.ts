import { Container, Graphics, Text } from 'pixi.js';
import type { SceneManager } from '../scenes/SceneManager.js';
import { REGION_SEGMENTS } from '../maps/Regions.js';

export class Hud {
  container = new Container();
  private staminaBar = new Graphics();
  private capacitationBar = new Graphics();
  private regionLabel = new Text({ text: '', style: { fill: 0xffffff, fontSize: 18 } });

  constructor(private manager: SceneManager) {
    this.container.addChild(this.staminaBar, this.capacitationBar, this.regionLabel);
  }

  update(stamina: number, capacitation: number, progress: number): void {
    this.staminaBar.clear();
    this.capacitationBar.clear();
    this.staminaBar.rect(20, 20, 220, 18).stroke({ color: 0xffffff, width: 2 });
    this.staminaBar.rect(20, 20, 220 * (stamina / 100), 18).fill({ color: 0x8ae6ff });

    this.capacitationBar.rect(20, 50, 220, 18).stroke({ color: 0xffffff, width: 2 });
    this.capacitationBar.rect(20, 50, 220 * (capacitation / 100), 18).fill({ color: 0xffd166 });

    const region = REGION_SEGMENTS[Math.floor(progress * REGION_SEGMENTS.length)] ?? REGION_SEGMENTS.at(-1);
    this.regionLabel.text = region ? `Region: ${region.label}` : 'Region: ???';
  }

  onResize(width: number, height: number): void {
    this.container.position.set(0, 0);
    this.regionLabel.position.set(20, height - 40);
  }
}
