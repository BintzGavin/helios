import { TimeDriver } from './TimeDriver.js';

export class NoopDriver implements TimeDriver {
  init(scope: HTMLElement | Document) {
    // No-op
  }

  update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }) {
    // No-op
  }

  waitUntilStable(): Promise<void> {
    return Promise.resolve();
  }
}
