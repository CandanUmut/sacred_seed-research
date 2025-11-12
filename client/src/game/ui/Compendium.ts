import { Container, Graphics, Text } from 'pixi.js';
import { REGION_SEGMENTS } from '../maps/Regions.js';

const ENTRIES: Record<string, string> = {
  vagina: 'Acidic baseline mitigated by seminal buffers. Practice steering and stamina pacing.',
  cervix: 'Fertile window microchannels guide motile sperm. Mucus strands act as gentle filters.',
  uterus: 'Wide lumen with rhythmic contractions that help propel swimmers toward the UTJ.',
  utj: 'Selective gate requiring capacitation and steady progress to reach the oviduct.',
  isthmus: 'Reservoir where sperm temporarily bind and await hyperactivation cues.',
  ampulla: 'Cumulus cloud near the oocyte with chemotactic gradients guiding the final sprint.',
};

export class Compendium {
  container = new Container();
  private panel = new Graphics();
  private title = new Text('Compendium', { fill: 0xffffff, fontSize: 26, fontWeight: 'bold' });
  private entries: Text[] = [];

  constructor() {
    this.container.visible = false;
    this.container.addChild(this.panel, this.title);
    REGION_SEGMENTS.forEach((segment, index) => {
      const entry = new Text(`${segment.label}: ${ENTRIES[segment.id]}`, {
        fill: 0xe6f7ff,
        fontSize: 16,
        wordWrap: true,
        wordWrapWidth: 520,
        lineHeight: 24,
      });
      entry.position.set(24, 64 + index * 80);
      this.entries.push(entry);
      this.container.addChild(entry);
    });
  }

  toggle(show: boolean): void {
    this.container.visible = show;
  }

  onResize(width: number, height: number): void {
    this.panel.clear();
    this.panel.beginFill(0x0b2a46, 0.96);
    this.panel.drawRoundedRect(width / 2 - 300, height / 2 - 220, 600, 440, 24);
    this.panel.endFill();
    this.panel.lineStyle(3, 0x3ea2ff);
    this.panel.drawRoundedRect(width / 2 - 300, height / 2 - 220, 600, 440, 24);
    this.panel.lineStyle(0);
    this.title.position.set(width / 2 - 260, height / 2 - 200);
    this.entries.forEach((entry, index) => {
      entry.position.set(width / 2 - 260, height / 2 - 160 + index * 70);
    });
  }
}
