import {
  PLAYER_BASE_SPEED,
  PLAYER_MAX_SPEED,
  PLAYER_RADIUS,
} from '@sperm-odyssey/shared';

export interface Vector2 {
  x: number;
  y: number;
}

export interface PhysicsParams {
  viscosity: number;
  drag: number;
  acceleration: number;
  maxSpeed?: number;
}

export interface PhysicsState {
  position: Vector2;
  velocity: Vector2;
}

export function integrateVelocity(
  state: PhysicsState,
  input: Vector2,
  flow: Vector2,
  dt: number,
  params: PhysicsParams
): void {
  const accelX = input.x * params.acceleration - state.velocity.x * params.drag + flow.x * params.viscosity;
  const accelY = input.y * params.acceleration - state.velocity.y * params.drag + flow.y * params.viscosity;
  state.velocity.x += accelX * dt;
  state.velocity.y += accelY * dt;
  clampSpeed(state.velocity, params.maxSpeed ?? PLAYER_MAX_SPEED);
  state.position.x += state.velocity.x * dt;
  state.position.y += state.velocity.y * dt;
}

export function clampSpeed(velocity: Vector2, maxSpeed = PLAYER_MAX_SPEED): void {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= maxSpeed) return;
  const scalar = maxSpeed / speed;
  velocity.x *= scalar;
  velocity.y *= scalar;
}

export function applyCollision(
  state: PhysicsState,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  if (state.position.x < bounds.minX + PLAYER_RADIUS) {
    state.position.x = bounds.minX + PLAYER_RADIUS;
    state.velocity.x = Math.abs(state.velocity.x) * 0.4;
  } else if (state.position.x > bounds.maxX - PLAYER_RADIUS) {
    state.position.x = bounds.maxX - PLAYER_RADIUS;
    state.velocity.x = -Math.abs(state.velocity.x) * 0.4;
  }
  if (state.position.y < bounds.minY + PLAYER_RADIUS) {
    state.position.y = bounds.minY + PLAYER_RADIUS;
    state.velocity.y = Math.abs(state.velocity.y) * 0.4;
  } else if (state.position.y > bounds.maxY - PLAYER_RADIUS) {
    state.position.y = bounds.maxY - PLAYER_RADIUS;
    state.velocity.y = -Math.abs(state.velocity.y) * 0.4;
  }
}

export function segmentSlowdown(
  state: PhysicsState,
  segment: { x1: number; y1: number; x2: number; y2: number; strength: number }
): void {
  const closest = closestPointOnSegment(state.position, segment);
  const dist = Math.hypot(state.position.x - closest.x, state.position.y - closest.y);
  if (dist < PLAYER_RADIUS * 4) {
    const factor = 1 - Math.min(1, (PLAYER_RADIUS * 4 - dist) / (PLAYER_RADIUS * 4));
    state.velocity.x *= factor * (1 - segment.strength);
    state.velocity.y *= factor * (1 - segment.strength);
  }
}

function closestPointOnSegment(point: Vector2, segment: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): Vector2 {
  const vx = segment.x2 - segment.x1;
  const vy = segment.y2 - segment.y1;
  const lenSq = vx * vx + vy * vy || 1;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - segment.x1) * vx + (point.y - segment.y1) * vy) / lenSq)
  );
  return {
    x: segment.x1 + vx * t,
    y: segment.y1 + vy * t,
  };
}

export function inputVector(input: {
  u: boolean;
  d: boolean;
  l: boolean;
  r: boolean;
  boost: boolean;
}): Vector2 {
  const x = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  const y = (input.d ? 1 : 0) - (input.u ? 1 : 0);
  const length = Math.hypot(x, y) || 1;
  const maxSpeed = input.boost ? PLAYER_MAX_SPEED : PLAYER_BASE_SPEED;
  return {
    x: (x / length) * maxSpeed,
    y: (y / length) * maxSpeed,
  };
}
