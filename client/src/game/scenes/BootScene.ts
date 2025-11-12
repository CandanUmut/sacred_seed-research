import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';

export class BootScene implements Scene {
  container = new Container();
  private text: Text;
  private elapsed = 0;

  constructor(private manager: SceneManager) {
    const bg = new Graphics();
    bg.beginFill(0x02111d);
    bg.drawRect(0, 0, 1, 1);
    bg.endFill();
    bg.scale.set(500);
    this.container.addChild(bg);
    this.text = new Text('Sperm Odyssey\nPreparing journey...', {
      fill: 0xffffff,
      fontSize: 32,
      align: 'center',
    });
    this.text.anchor.set(0.5);
    this.container.addChild(this.text);
  }

  update(delta: number): void {
    this.elapsed += delta / 60;
    if (this.elapsed > 1.5) {
      this.manager.goTo('menu');
    }
  }

  onResize(width: number, height: number): void {
    this.text.position.set(width / 2, height / 2);
  }

  onEnter(): void {
    this.elapsed = 0;
  }

  onExit(): void {
    // nothing
  }
}
