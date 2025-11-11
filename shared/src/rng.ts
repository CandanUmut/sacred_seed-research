/** Lightweight seeded pseudo-random number generator using mulberry32. */
export class SeededRng {
  private state: number;

  constructor(seed: string) {
    this.state = SeededRng.hash(seed);
  }

  getState(): number {
    return this.state;
  }

  static hash(seed: string): number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h ^ (h >>> 16)) >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  fork(label: string): SeededRng {
    return new SeededRng(`${this.state}:${label}`);
  }

  gaussian(mean = 0, stdDev = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const mag = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + stdDev * mag;
  }

  pick<T>(array: readonly T[]): T {
    return array[Math.floor(this.next() * array.length) % array.length];
  }
}

export function shuffle<T>(array: T[], rng: SeededRng): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function noise2D(x: number, y: number, rng: SeededRng): number {
  const seed = SeededRng.hash(`${x}:${y}:${rng.getState()}`);
  const nRng = new SeededRng(String(seed));
  return nRng.next() * 2 - 1;
}
