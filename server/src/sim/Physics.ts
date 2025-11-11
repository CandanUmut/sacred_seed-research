import type { InputFrame } from '@sperm-odyssey/shared';

export interface PhysicsState {
  speed: number;
  direction: { x: number; y: number };
}

export function normalizeInput(frame: InputFrame): PhysicsState {
  const length = Math.hypot(frame.direction.x, frame.direction.y) || 1;
  return {
    speed: length,
    direction: { x: frame.direction.x / length, y: frame.direction.y / length },
  };
}
