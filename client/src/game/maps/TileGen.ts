import type { Application, Graphics } from 'pixi.js';
import { REGION_SEGMENTS } from './Regions.js';

export function createRegionBackdrop(app: Application, container: Graphics): void {
  const { width, height } = app.renderer;
  container.clear();
  REGION_SEGMENTS.forEach((segment, index) => {
    const color = [0x0a1f33, 0x123d5e, 0x18547d, 0x22648f, 0x2b74a1, 0x3989b8][index % 6];
    container.rect(0, (height / REGION_SEGMENTS.length) * index, width, height / REGION_SEGMENTS.length).fill({ color, alpha: 0.7 });
  });
}
