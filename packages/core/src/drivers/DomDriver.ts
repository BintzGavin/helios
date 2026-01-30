import { TimeDriver } from './TimeDriver.js';

interface TrackState {
  baseVolume: number;
  lastSetVolume: number;
  baseMuted: boolean;
  lastSetMuted: boolean;
}

export class DomDriver implements TimeDriver {
  private scope: HTMLElement | Document | null = null;
  private scopes = new Set<Node>();
  private observers = new Map<Node, MutationObserver>();
  private trackStates = new WeakMap<HTMLMediaElement, TrackState>();
  private mediaElements = new Set<HTMLMediaElement>();

  init(scope: HTMLElement | Document) {
    this.scope = scope;
    this.mediaElements.clear();
    this.scopes.clear();
    this.observers.clear();

    this.addScope(scope);
    this.scanAndAdd(scope);
  }

  private addScope(scope: Node) {
    if (this.scopes.has(scope)) return;
    this.scopes.add(scope);

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            this.scanAndAdd(node);
          });
          m.removedNodes.forEach((node) => {
            this.scanAndRemove(node);
          });
        });
      });
      observer.observe(scope, { childList: true, subtree: true });
      this.observers.set(scope, observer);
    }
  }

  private removeScope(scope: Node) {
    if (!this.scopes.has(scope)) return;
    this.scopes.delete(scope);

    const observer = this.observers.get(scope);
    if (observer) {
      observer.disconnect();
      this.observers.delete(scope);
    }
  }

  private scanAndAdd(node: Node) {
    const processElement = (el: Element) => {
      // Add media element
      if (el.nodeName === 'AUDIO' || el.nodeName === 'VIDEO') {
        this.mediaElements.add(el as HTMLMediaElement);
      }

      // Discover shadow root
      if (el.shadowRoot) {
        if (!this.scopes.has(el.shadowRoot)) {
            this.addScope(el.shadowRoot);
            // Recursively scan the shadow root
            this.scanAndAdd(el.shadowRoot);
        }
      }
    };

    // 1. Process the node itself if it's an element
    if (typeof Element !== 'undefined' && node instanceof Element) {
      processElement(node);
    }

    // 2. Process descendants
    // If node is Element or DocumentFragment (ShadowRoot), it supports querySelectorAll
    if ('querySelectorAll' in node) {
       // We use querySelectorAll('*') to find all descendants in the current scope (Light DOM)
       // This is efficient and handles nested structure within this scope.
       // It will NOT pierce into Shadow Roots, which is why we check el.shadowRoot above.
       const descendants = (node as Element | DocumentFragment).querySelectorAll('*');
       descendants.forEach(el => processElement(el));
    }
  }

  private scanAndRemove(node: Node) {
     const processElement = (el: Element) => {
      if (el.nodeName === 'AUDIO' || el.nodeName === 'VIDEO') {
        this.mediaElements.delete(el as HTMLMediaElement);
      }
      if (el.shadowRoot) {
        if (this.scopes.has(el.shadowRoot)) {
            this.removeScope(el.shadowRoot);
            this.scanAndRemove(el.shadowRoot);
        }
      }
    };

    if (typeof Element !== 'undefined' && node instanceof Element) {
      processElement(node);
    }

    if ('querySelectorAll' in node) {
       const descendants = (node as Element | DocumentFragment).querySelectorAll('*');
       descendants.forEach(el => processElement(el));
    }
  }

  dispose() {
    this.observers.forEach((obs) => obs.disconnect());
    this.observers.clear();
    this.mediaElements.clear();
    this.scopes.clear();
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
      if (typeof Document !== 'undefined' && this.scope instanceof Document) return Array.from(this.scope.images);
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

    // Iterate all discovered scopes (Document + ShadowRoots)
    for (const scope of this.scopes) {
        if (typeof (scope as any).getAnimations === 'function') {
            const scopeAnims = (scope as any).getAnimations({ subtree: true });
            scopeAnims.forEach((a: Animation) => anims.push(a));
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

      // --- Offset & Seek Logic ---
      const offset = parseFloat(el.getAttribute('data-helios-offset') || '0');
      const seek = parseFloat(el.getAttribute('data-helios-seek') || '0');

      // Check if we are before the start time
      const timeRelToStart = timeInSeconds - offset;
      const isBeforeStart = timeRelToStart < 0;

      // effectiveTime is where the media element should be.
      // If before start, we hold at the in-point (seek).
      const targetTime = Math.max(0, timeRelToStart + seek);

      // Sync Playback Rate
      if (el.playbackRate !== playbackRate) {
        el.playbackRate = playbackRate;
      }

      if (isPlaying && !isBeforeStart) {
        // Playback Mode
        if (el.paused) {
             el.play().catch(() => {
                 // Ignore autoplay errors
             });
        }

        // Drift Correction (only seek if significantly off)
        const diff = Math.abs(el.currentTime - targetTime);
        if (diff > 0.25) { // 250ms tolerance
          el.currentTime = targetTime;
        }
      } else {
        // Scrubbing Mode OR Before Start
        if (!el.paused) {
            el.pause();
        }

        // Always seek to exact time
        // If before start, we hold at seek time (in-point)
        const scrubTime = isBeforeStart ? seek : targetTime;

        if (Math.abs(el.currentTime - scrubTime) > 0.001) {
            el.currentTime = scrubTime;
        }
      }
    });
  }
}
