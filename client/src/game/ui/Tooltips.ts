import { Container, Graphics, Text } from 'pixi.js';

export interface TooltipData {
  title: string;
  description: string;
}

export class Tooltips {
  container = new Container();
  private background = new Graphics();
  private title = new Text({ text: '', style: { fill: 0xffffff, fontSize: 20, fontWeight: 'bold' } });
  private description = new Text({ text: '', style: { fill: 0xe0f7ff, fontSize: 16, wordWrap: true, wordWrapWidth: 320 } });

  constructor() {
    this.container.addChild(this.background, this.title, this.description);
    this.container.visible = false;
  }

  show(data: TooltipData): void {
    this.title.text = data.title;
    this.description.text = data.description;
    this.background.clear();
    this.background.roundRect(0, 0, 360, 140, 12).fill({ color: 0x0b2135, alpha: 0.9 }).stroke({ color: 0x3ea2ff, width: 2 });
    this.title.position.set(16, 16);
    this.description.position.set(16, 52);
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  onResize(width: number, height: number): void {
    this.container.position.set(width - 400, height - 180);
  }
}
