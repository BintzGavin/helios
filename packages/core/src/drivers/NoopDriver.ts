import { TimeDriver } from './TimeDriver';

export class NoopDriver implements TimeDriver {
  init(scope: HTMLElement | Document) {
    // No-op
  }

  update(timeInMs: number) {
    // No-op
  }
}
