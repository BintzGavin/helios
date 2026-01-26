import { Ticker, TickCallback } from './Ticker';

export class TimeoutTicker implements Ticker {
  private running = false;
  private lastTime = 0;
  private callback: TickCallback | null = null;
  private timer: any = null;

  start(cb: TickCallback) {
    if (this.running) return;
    this.running = true;
    this.callback = cb;
    this.lastTime = this.now();
    this.loop();
  }

  stop() {
    this.running = false;
    this.callback = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private loop = () => {
    if (!this.running) return;

    const now = this.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (this.callback) {
      this.callback(dt);
    }

    if (this.running) {
        // Target ~60 FPS (16ms)
        this.timer = setTimeout(this.loop, 16);
    }
  }

  private now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
}
