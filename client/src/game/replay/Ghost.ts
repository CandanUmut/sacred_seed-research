import { Graphics } from 'pixi.js';
import type { ReplaySamples } from '@sperm-odyssey/shared';

type GraphicsLike = {
  alpha: number;
  lineStyle(style: { color: number; width: number; alpha: number }): GraphicsLike;
  moveTo(x: number, y: number): GraphicsLike;
  lineTo(x: number, y: number): GraphicsLike;
  endFill(): GraphicsLike;
  destroy(): void;
};

type ContainerLike = {
  addChild: (...children: GraphicsLike[]) => unknown;
  removeChild?: (child: GraphicsLike) => unknown;
};

interface GhostTrack {
  id: number;
  graphics: GraphicsLike;
}

export type GraphicsFactory = () => GraphicsLike;

const defaultFactory: GraphicsFactory = () => new Graphics();

export class GhostLayer {
  private readonly tracks = new Map<number, GhostTrack>();

  constructor(
    private readonly container: ContainerLike,
    private readonly createGraphics: GraphicsFactory = defaultFactory
  ) {}

  clear(): void {
    for (const track of this.tracks.values()) {
      this.container.removeChild?.(track.graphics);
      track.graphics.destroy();
    }
    this.tracks.clear();
  }

  load(samples: ReplaySamples): void {
    this.clear();
    const byEntity = new Map<number, { x: number; y: number }[]>();
    for (const sample of samples.samples) {
      if (!byEntity.has(sample.id)) {
        byEntity.set(sample.id, []);
      }
      byEntity.get(sample.id)!.push({ x: sample.x, y: sample.y });
    }
    for (const [entityId, points] of byEntity.entries()) {
      if (points.length === 0) continue;
      const graphics = this.createGraphics();
      graphics.alpha = 0.35;
      graphics.lineStyle({ color: 0x6a5acd, width: 2, alpha: 0.6 });
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) {
        graphics.lineTo(point.x, point.y);
      }
      graphics.endFill();
      this.container.addChild(graphics);
      this.tracks.set(entityId, { id: entityId, graphics });
    }
  }
}
