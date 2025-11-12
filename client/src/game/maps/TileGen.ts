import type { Application, Graphics } from 'pixi.js';
import { REGION_SEGMENTS } from './Regions.js';

export function createRegionBackdrop(app: Application, container: Graphics): void {
  const { width, height } = app.renderer;
  container.clear();
  REGION_SEGMENTS.forEach((_segment, index) => {
    const color = [0x0a1f33, 0x123d5e, 0x18547d, 0x22648f, 0x2b74a1, 0x3989b8][index % 6];
    const y = (height / REGION_SEGMENTS.length) * index;
    const segmentHeight = height / REGION_SEGMENTS.length;
    container.beginFill(color, 0.7);
    container.drawRect(0, y, width, segmentHeight);
    container.endFill();
  });
}
