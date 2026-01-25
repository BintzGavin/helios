import { Ticker, TickCallback } from './Ticker';

export class ManualTicker implements Ticker {
  private callback: TickCallback | null = null;

  start(cb: TickCallback) {
    this.callback = cb;
  }

  stop() {
    this.callback = null;
  }

  tick(deltaTime: number) {
    if (this.callback) {
      this.callback(deltaTime);
    }
  }
}
