import { TimeDriver, DriverMetadata, AudioTrackMetadata } from './TimeDriver.js';

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
  private discoveredTracks = new Map<string, AudioTrackMetadata>();
  private metadataSubscribers = new Set<(meta: DriverMetadata) => void>();

  init(scope: unknown) {
    // Allow HTMLElement/Document (Browser) or objects with getAnimations/querySelectorAll (Mocks/Tests)
    const isDom = typeof HTMLElement !== 'undefined' && (scope instanceof HTMLElement || scope instanceof Document);
    const isMock = scope && (typeof (scope as any).getAnimations === 'function' || typeof (scope as any).querySelectorAll === 'function');

    if (isDom || isMock) {
      this.scope = scope as HTMLElement | Document;
      this.mediaElements.clear();
      this.scopes.clear();
      this.observers.clear();
      this.discoveredTracks.clear();

      this.addScope(this.scope);
      this.scanAndAdd(this.scope);
    } else if (scope) {
      console.warn('DomDriver initialized with invalid scope', scope);
    }
  }

  subscribeToMetadata(callback: (meta: DriverMetadata) => void): () => void {
    this.metadataSubscribers.add(callback);
    callback({ audioTracks: Array.from(this.discoveredTracks.values()) });
    return () => this.metadataSubscribers.delete(callback);
  }

  private emitMetadata() {
    const tracks = Array.from(this.discoveredTracks.values());
    this.metadataSubscribers.forEach((cb) => cb({ audioTracks: tracks }));
  }

  private addScope(scope: Node) {
    if (this.scopes.has(scope)) return;
    this.scopes.add(scope);

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.type === 'childList') {
            m.addedNodes.forEach((node) => {
              this.scanAndAdd(node);
            });
            m.removedNodes.forEach((node) => {
              this.scanAndRemove(node);
            });
          } else if (m.type === 'attributes') {
            if (m.target.nodeName === 'AUDIO' || m.target.nodeName === 'VIDEO') {
              this.rebuildDiscoveredTracks();
            }
          }
        });
      });
      observer.observe(scope, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-helios-track-id', 'data-helios-offset', 'data-helios-fade-in', 'data-helios-fade-out', 'src']
      });
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

  private handleMetadataChange = () => {
    this.rebuildDiscoveredTracks();
  };

  private scanAndAdd(node: Node) {
    let tracksChanged = false;
    const processElement = (el: Element) => {
      // Add media element
      if (el.nodeName === 'AUDIO' || el.nodeName === 'VIDEO') {
        const mediaEl = el as HTMLMediaElement;
        this.mediaElements.add(mediaEl);

        // Add listeners for metadata updates
        mediaEl.addEventListener('durationchange', this.handleMetadataChange);
        mediaEl.addEventListener('loadedmetadata', this.handleMetadataChange);

        const trackId = el.getAttribute('data-helios-track-id');
        if (trackId) {
            // Even if we already have it, we might need to update metadata
            // But we'll let rebuildDiscoveredTracks handle the details to avoid duplication here
            // We just flag that we found something relevant
            tracksChanged = true;
        }
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
    if ('querySelectorAll' in node) {
       const descendants = (node as Element | DocumentFragment).querySelectorAll('*');
       descendants.forEach(el => processElement(el));
    }

    if (tracksChanged) {
        this.rebuildDiscoveredTracks();
    }
  }

  private scanAndRemove(node: Node) {
     let removedMedia = false;
     const processElement = (el: Element) => {
      if (el.nodeName === 'AUDIO' || el.nodeName === 'VIDEO') {
        const mediaEl = el as HTMLMediaElement;
        if (this.mediaElements.delete(mediaEl)) {
            removedMedia = true;
            mediaEl.removeEventListener('durationchange', this.handleMetadataChange);
            mediaEl.removeEventListener('loadedmetadata', this.handleMetadataChange);
        }
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

    if (removedMedia) {
        this.rebuildDiscoveredTracks();
    }
  }

  private rebuildDiscoveredTracks() {
      const oldTracks = new Map(this.discoveredTracks);
      this.discoveredTracks.clear();

      this.mediaElements.forEach(el => {
          const id = el.getAttribute('data-helios-track-id');
          if (id) {
            const startTime = parseFloat(el.getAttribute('data-helios-offset') || '0');
            const duration = (!isNaN(el.duration) && isFinite(el.duration)) ? el.duration : 0;
            const fadeInDuration = parseFloat(el.getAttribute('data-helios-fade-in') || '0');
            const fadeOutDuration = parseFloat(el.getAttribute('data-helios-fade-out') || '0');
            const src = el.currentSrc || el.src || '';

            this.discoveredTracks.set(id, {
                id,
                src,
                startTime,
                duration,
                fadeInDuration,
                fadeOutDuration
            });
          }
      });

      // Check for changes
      if (oldTracks.size !== this.discoveredTracks.size) {
          this.emitMetadata();
          return;
      }

      for (const [id, meta] of this.discoveredTracks) {
          const oldMeta = oldTracks.get(id);
          if (!oldMeta) {
              this.emitMetadata();
              return;
          }
          if (oldMeta.startTime !== meta.startTime || oldMeta.duration !== meta.duration || oldMeta.fadeInDuration !== meta.fadeInDuration || oldMeta.fadeOutDuration !== meta.fadeOutDuration || oldMeta.src !== meta.src) {
              this.emitMetadata();
              return;
          }
      }
  }

  dispose() {
    this.observers.forEach((obs) => obs.disconnect());
    this.observers.clear();

    this.mediaElements.forEach(el => {
        el.removeEventListener('durationchange', this.handleMetadataChange);
        el.removeEventListener('loadedmetadata', this.handleMetadataChange);
    });
    this.mediaElements.clear();

    this.scopes.clear();
    this.discoveredTracks.clear();
    this.metadataSubscribers.clear();
  }

  update(timeInMs: number, options: {
    isPlaying: boolean;
    playbackRate: number;
    volume?: number;
    muted?: boolean;
    audioTracks?: Record<string, { volume: number; muted: boolean }>;
  } = { isPlaying: false, playbackRate: 1 }) {
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

  private syncMediaElements(timeInMs: number, { isPlaying, playbackRate, volume, muted, audioTracks }: {
    isPlaying: boolean;
    playbackRate: number;
    volume?: number;
    muted?: boolean;
    audioTracks?: Record<string, { volume: number; muted: boolean }>;
  }) {
    if (!this.scope) return;

    // Use cached mediaElements instead of querySelectorAll
    const timeInSeconds = timeInMs / 1000;

    this.mediaElements.forEach((el) => {
      let state = this.trackStates.get(el);

      // --- Track Logic ---
      const trackId = el.getAttribute('data-helios-track-id');
      let trackVol = 1;
      let trackMuted = false;

      if (trackId && audioTracks && audioTracks[trackId]) {
        trackVol = audioTracks[trackId].volume;
        trackMuted = audioTracks[trackId].muted;
      }

      // --- Offset & Seek Logic ---
      const offset = parseFloat(el.getAttribute('data-helios-offset') || '0');
      const seek = parseFloat(el.getAttribute('data-helios-seek') || '0');
      const timeRelToStart = timeInSeconds - offset;

      // --- Fade Logic ---
      const fadeInDuration = parseFloat(el.getAttribute('data-helios-fade-in') || '0');
      const fadeOutDuration = parseFloat(el.getAttribute('data-helios-fade-out') || '0');

      let fadeInMultiplier = 1;
      if (fadeInDuration > 0) {
        fadeInMultiplier = Math.max(0, Math.min(1, timeRelToStart / fadeInDuration));
      }

      let fadeOutMultiplier = 1;
      // We need duration to calculate time remaining.
      // effectiveTime (playback position) = timeRelToStart + seek
      // But we only care about how close we are to the end of the clip.
      // If we are scrubbing, we use the target time.
      if (fadeOutDuration > 0 && !isNaN(el.duration) && isFinite(el.duration)) {
        const targetTime = Math.max(0, timeRelToStart + seek);
        const timeRemaining = el.duration - targetTime;
        fadeOutMultiplier = Math.max(0, Math.min(1, timeRemaining / fadeOutDuration));
      }

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
      const effectiveVol = Math.max(0, Math.min(1, baseVol * masterVolume * trackVol * fadeInMultiplier * fadeOutMultiplier));

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
      const effectiveMuted = baseMuted || masterMuted || trackMuted;

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

      // Check if we are before the start time
      const isBeforeStart = timeRelToStart < 0;

      // effectiveTime is where the media element should be.
      let targetTime: number;

      if (el.loop && !isNaN(el.duration) && isFinite(el.duration) && el.duration > 0) {
        // If looping, wrap around duration.
        // We only rely on targetTime when !isBeforeStart (timeRelToStart >= 0),
        // so (timeRelToStart + seek) is guaranteed positive.
        targetTime = (timeRelToStart + seek) % el.duration;
      } else {
        targetTime = Math.max(0, timeRelToStart + seek);
      }

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
