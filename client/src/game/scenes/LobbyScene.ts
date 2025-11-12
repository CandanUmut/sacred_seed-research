import { Container, Graphics, Text } from 'pixi.js';
import type { Scene, SceneManager } from './SceneManager.js';
import { SeasonBoard } from '../ui/SeasonBoard.js';

export class LobbyScene implements Scene {
  container = new Container();
  private countdownText = new Text('Preparing lobby...', { fill: 0xffffff, fontSize: 24 });
  private timeRemaining = 5;
  private seasonBoard = new SeasonBoard();

  constructor(private manager: SceneManager) {
    const bg = new Graphics();
    bg.beginFill(0x042f4e);
    bg.drawRect(0, 0, 1, 1);
    bg.endFill();
    bg.scale.set(80);
    this.container.addChild(bg, this.countdownText, this.seasonBoard.container);
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
    this.seasonBoard.onResize(width, height);
  }

  onEnter(): void {
    this.timeRemaining = 5;
    void this.seasonBoard.loadCurrent();
  }

  onExit(): void {}
}
