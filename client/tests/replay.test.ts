import { describe, it, expect, vi } from 'vitest';
import { GhostLayer } from '../src/game/replay/Ghost.js';
import type { ReplaySamples } from '@sperm-odyssey/shared';

describe('GhostLayer', () => {
  it('renders ghost tracks for replay samples', () => {
    const container = {
      children: [] as unknown[],
      addChild: vi.fn(function addChild(child: unknown) {
        container.children.push(child);
      }),
      removeChild: vi.fn(function removeChild(child: unknown) {
        const index = container.children.indexOf(child);
        if (index >= 0) container.children.splice(index, 1);
      }),
    };
    const graphicsFactory = vi.fn(() => {
      const graphic: any = {
        alpha: 0,
        lineStyle: vi.fn(() => graphic),
        moveTo: vi.fn(() => graphic),
        lineTo: vi.fn(() => graphic),
        endFill: vi.fn(() => graphic),
        destroy: vi.fn(),
      };
      return graphic;
    });
    const layer = new GhostLayer(container, graphicsFactory);
    const samples: ReplaySamples = {
      header: { version: 1, seed: 42, worldHash: 'SimWorld:v1', startedAt: Date.now() },
      samples: [
        { id: 1, tick: 1, x: 0, y: 0, vx: 0, vy: 0 },
        { id: 1, tick: 2, x: 10, y: 10, vx: 0, vy: 0 },
        { id: 2, tick: 1, x: -5, y: 0, vx: 0, vy: 0 },
        { id: 2, tick: 2, x: -10, y: -10, vx: 0, vy: 0 },
      ],
    };
    layer.load(samples);
    expect(graphicsFactory).toHaveBeenCalledTimes(2);
    expect(container.children.length).toBe(2);
  });
});
