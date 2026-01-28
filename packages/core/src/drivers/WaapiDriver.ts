import { TimeDriver } from './TimeDriver';

/**
 * @deprecated Use DomDriver instead, which supports both WAAPI and HTMLMediaElements.
 */
export class WaapiDriver implements TimeDriver {
  private scope: HTMLElement | Document | null = null;

  init(scope: HTMLElement | Document) {
    this.scope = scope;
  }

  update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }) {
    if (!this.scope) return;
    if (typeof document === 'undefined') return;

    let anims: Animation[] = [];

    // Check if animationScope is Document
    const isDocument = typeof Document !== 'undefined' && this.scope instanceof Document;

    if (isDocument) {
      if (typeof (this.scope as Document).getAnimations === 'function') {
        anims = (this.scope as Document).getAnimations();
      }
    } else {
      // Assume HTMLElement or similar interface
      if (typeof (this.scope as any).getAnimations === 'function') {
        anims = (this.scope as any).getAnimations({ subtree: true });
      }
    }

    anims.forEach((anim: Animation) => {
      anim.currentTime = timeInMs;
      // Ensure it doesn't auto-play if we are driving it
      if (anim.playState !== 'paused') {
        anim.pause();
      }
    });
  }

  waitUntilStable(): Promise<void> {
    return Promise.resolve();
  }
}
