import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';

export class LobbyScene implements Scene {
  container = new Container();
  private countdownText = new Text({ text: 'Preparing lobby...', style: { fill: 0xffffff, fontSize: 24 } });
  private timeRemaining = 5;

  constructor(private manager: SceneManager) {
    const bg = new Graphics().rect(0, 0, 20, 12).fill({ color: 0x042f4e });
    bg.scale.set(80);
    this.container.addChild(bg, this.countdownText);
  }

  update(delta: number): void {
    this.timeRemaining -= delta / 60;
    if (this.timeRemaining <= 0) {
      this.manager.goTo('multiplayer');
    }
    this.countdownText.text = `Matchmaking... ${Math.max(0, this.timeRemaining).toFixed(1)}s`;
  }

  onResize(width: number, height: number): void {
    this.countdownText.position.set(width / 2 - 160, height / 2);
  }

  onEnter(): void {
    this.timeRemaining = 5;
  }

  onExit(): void {}
}
