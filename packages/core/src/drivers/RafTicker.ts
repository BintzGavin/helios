import { Ticker, TickCallback } from './Ticker';

export class RafTicker implements Ticker {
  private frameId: number | null = null;
  private lastTime: number = 0;
  private callback: TickCallback | null = null;

  start(cb: TickCallback) {
    this.callback = cb;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.callback = null;
  }

  private loop = () => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    if (this.callback) {
      this.callback(dt);
      // Only schedule next frame if we are still running
      if (this.callback) {
        this.frameId = requestAnimationFrame(this.loop);
      }
    }
  }
}
