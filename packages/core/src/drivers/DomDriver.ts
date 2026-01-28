import { TimeDriver } from './TimeDriver.js';

interface TrackState {
  baseVolume: number;
  lastSetVolume: number;
  baseMuted: boolean;
  lastSetMuted: boolean;
}

export class DomDriver implements TimeDriver {
  private scope: HTMLElement | Document | null = null;
  private trackStates = new WeakMap<HTMLMediaElement, TrackState>();
  private mediaElements = new Set<HTMLMediaElement>();
  private observer: MutationObserver | null = null;

  init(scope: HTMLElement | Document) {
    this.scope = scope;
    this.mediaElements.clear();

    if (typeof (this.scope as any).querySelectorAll === 'function') {
      const initial = (this.scope as any).querySelectorAll('audio, video');
      initial.forEach((el: Element) => this.mediaElements.add(el as HTMLMediaElement));
    }

    if (typeof MutationObserver !== 'undefined' && (this.scope instanceof Element || this.scope instanceof Document)) {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            this.scanAndAdd(node);
          });
          m.removedNodes.forEach((node) => {
            this.scanAndRemove(node);
          });
        });
      });
      // Cast scope to Node because Document inherits from Node in DOM types
      // even if TS strictness might complain about Document vs Node
      this.observer.observe(this.scope as Node, { childList: true, subtree: true });
    }
  }

  private scanAndAdd(node: Node) {
    if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
      this.mediaElements.add(node as HTMLMediaElement);
    }
    if (node instanceof Element) {
      if (node.querySelectorAll) {
        const children = node.querySelectorAll('audio, video');
        children.forEach((el) => this.mediaElements.add(el as HTMLMediaElement));
      }
    }
  }

  private scanAndRemove(node: Node) {
    if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
      this.mediaElements.delete(node as HTMLMediaElement);
    }
    if (node instanceof Element) {
      if (node.querySelectorAll) {
        const children = node.querySelectorAll('audio, video');
        children.forEach((el) => this.mediaElements.delete(el as HTMLMediaElement));
      }
    }
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
    this.mediaElements.clear();
  }

  update(timeInMs: number, options: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean } = { isPlaying: false, playbackRate: 1 }) {
    if (!this.scope) return;
    if (typeof document === 'undefined') return;

    this.syncWaapiAnimations(timeInMs);
    this.syncMediaElements(timeInMs, options);
  }

  async waitUntilStable(): Promise<void> {
    if (!this.scope) return;
    if (typeof document === 'undefined') return;

    // 1. Fonts
    // @ts-ignore - document.fonts might not be in all TS defs
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    // 2. Images
    const getImages = () => {
      if (this.scope instanceof Document) return Array.from(this.scope.images);
      if (this.scope && 'querySelectorAll' in this.scope) {
        return Array.from((this.scope as Element).querySelectorAll('img'));
      }
      return [];
    };

    const imagePromises = getImages().map((img: HTMLImageElement) => {
      if (img.complete) return Promise.resolve();
      return img.decode().catch(() => {});
    });

    // 3. Media
    const mediaPromises = Array.from(this.mediaElements).map(el => {
      return new Promise<void>((resolve) => {
        if (el.error) return resolve(); // Don't block on error

        // Check if ready
        // readyState 2 = HAVE_CURRENT_DATA
        // If we are seeking, we must wait for 'seeked'.
        // If we are not seeking, but have no data, we wait for 'canplay'.
        const isReady = !el.seeking && el.readyState >= 2;
        if (isReady) return resolve();

        const onReady = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          resolve();
        };

        const cleanup = () => {
          el.removeEventListener('seeked', onReady);
          el.removeEventListener('canplay', onReady);
          el.removeEventListener('error', onError);
        };

        el.addEventListener('seeked', onReady);
        el.addEventListener('canplay', onReady);
        el.addEventListener('error', onError);
      });
    });

    await Promise.all([fontPromise, ...imagePromises, ...mediaPromises]);
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

  private syncMediaElements(timeInMs: number, { isPlaying, playbackRate, volume, muted }: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }) {
    if (!this.scope) return;

    // Use cached mediaElements instead of querySelectorAll
    const timeInSeconds = timeInMs / 1000;

    this.mediaElements.forEach((el) => {
      let state = this.trackStates.get(el);

      // --- Volume Logic ---
      const currentVol = el.volume;
      let baseVol = currentVol;

      if (state) {
        // If current volume differs from what we last set, assume external change
        if (Math.abs(currentVol - state.lastSetVolume) > 0.0001) {
          baseVol = currentVol;
        } else {
          baseVol = state.baseVolume;
        }
      }

      // If master volume is provided, use it; otherwise assume 1 (no scaling)
      const masterVolume = volume ?? 1;
      const effectiveVol = Math.max(0, Math.min(1, baseVol * masterVolume));

      if (Math.abs(el.volume - effectiveVol) > 0.0001) {
        el.volume = effectiveVol;
      }

      // --- Mute Logic ---
      const currentMuted = el.muted;
      let baseMuted = currentMuted;

      if (state) {
        // If current muted state differs from what we last set, assume external change
        if (currentMuted !== state.lastSetMuted) {
          baseMuted = currentMuted;
        } else {
          baseMuted = state.baseMuted;
        }
      }

      // If master muted is provided, use it; otherwise assume false (no forced mute)
      const masterMuted = muted ?? false;
      const effectiveMuted = baseMuted || masterMuted;

      if (el.muted !== effectiveMuted) {
        el.muted = effectiveMuted;
      }

      // Update state
      this.trackStates.set(el, {
        baseVolume: baseVol,
        lastSetVolume: effectiveVol,
        baseMuted: baseMuted,
        lastSetMuted: effectiveMuted
      });

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
