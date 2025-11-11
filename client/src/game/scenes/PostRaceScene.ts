import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';

export class PostRaceScene implements Scene {
  container = new Container();
  private summary = new Text({
    text: 'Race complete! The cortical reaction prevents polyspermy. Great job exploring the journey!',
    style: { fill: 0xffffff, fontSize: 22, wordWrap: true, wordWrapWidth: 640 },
  });
  private button = new Text({ text: 'Return to Menu', style: { fill: 0x8ae6ff, fontSize: 26 } });

  constructor(private manager: SceneManager) {
    const bg = new Graphics().rect(0, 0, 16, 10).fill({ color: 0x082742 });
    bg.scale.set(100);
    this.container.addChild(bg, this.summary, this.button);
    this.button.eventMode = 'static';
    this.button.cursor = 'pointer';
    this.button.on('pointertap', () => this.manager.goTo('menu'));
  }

  update(): void {}

  onResize(width: number, height: number): void {
    this.summary.position.set(width / 2 - 320, height / 2 - 80);
    this.button.position.set(width / 2 - 120, height / 2 + 40);
  }

  onEnter(): void {}

  onExit(): void {}
}
