import { logger } from './logger';

export class RateLimiter {
  private lastCallTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 1000) {
    this.minInterval = minIntervalMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      logger.debug(`Rate limiting: waiting ${waitTime}ms before next API call`);
      await this.sleep(waitTime);
    }

    this.lastCallTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setInterval(intervalMs: number): void {
    this.minInterval = intervalMs;
  }

  getInterval(): number {
    return this.minInterval;
  }
}