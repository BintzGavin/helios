import { TimeDriver } from './TimeDriver';

export class DomDriver implements TimeDriver {
  private scope: HTMLElement | Document | null = null;

  init(scope: HTMLElement | Document) {
    this.scope = scope;
  }

  update(timeInMs: number, options: { isPlaying: boolean; playbackRate: number } = { isPlaying: false, playbackRate: 1 }) {
    if (!this.scope) return;
    if (typeof document === 'undefined') return;

    this.syncWaapiAnimations(timeInMs);
    this.syncMediaElements(timeInMs, options);
  }

  private syncWaapiAnimations(timeInMs: number) {
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

  private syncMediaElements(timeInMs: number, { isPlaying, playbackRate }: { isPlaying: boolean; playbackRate: number }) {
    if (!this.scope) return;

    // Both Document and HTMLElement implement ParentNode which has querySelectorAll
    if (typeof (this.scope as any).querySelectorAll !== 'function') return;

    const mediaElements = (this.scope as any).querySelectorAll('audio, video');
    const timeInSeconds = timeInMs / 1000;

    mediaElements.forEach((media: Element) => {
      const el = media as HTMLMediaElement;

      // Sync Playback Rate
      if (el.playbackRate !== playbackRate) {
        el.playbackRate = playbackRate;
      }

      if (isPlaying) {
        // Playback Mode
        if (el.paused) {
             el.play().catch(() => {
                 // Ignore autoplay errors
             });
        }

        // Drift Correction (only seek if significantly off)
        const diff = Math.abs(el.currentTime - timeInSeconds);
        if (diff > 0.25) { // 250ms tolerance
          el.currentTime = timeInSeconds;
        }
      } else {
        // Scrubbing Mode
        if (!el.paused) {
            el.pause();
        }

        // Always seek to exact time
        if (Math.abs(el.currentTime - timeInSeconds) > 0.001) {
            el.currentTime = timeInSeconds;
        }
      }
    });
  }
}
