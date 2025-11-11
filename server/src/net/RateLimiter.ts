export class RateLimiter {
  private last = 0;
  constructor(private intervalMs: number) {}

  allow(now = Date.now()): boolean {
    if (now - this.last >= this.intervalMs) {
      this.last = now;
      return true;
    }
    return false;
  }
}
