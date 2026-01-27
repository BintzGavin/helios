import { TimeDriver } from './TimeDriver';

interface TrackState {
  baseVolume: number;
  lastSetVolume: number;
  baseMuted: boolean;
  lastSetMuted: boolean;
}

export class DomDriver implements TimeDriver {
  private scope: HTMLElement | Document | null = null;
  private trackStates = new WeakMap<HTMLMediaElement, TrackState>();

  init(scope: HTMLElement | Document) {
    this.scope = scope;
  }

  update(timeInMs: number, options: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean } = { isPlaying: false, playbackRate: 1 }) {
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

  private syncMediaElements(timeInMs: number, { isPlaying, playbackRate, volume, muted }: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }) {
    if (!this.scope) return;

    // Both Document and HTMLElement implement ParentNode which has querySelectorAll
    if (typeof (this.scope as any).querySelectorAll !== 'function') return;

    const mediaElements = (this.scope as any).querySelectorAll('audio, video');
    const timeInSeconds = timeInMs / 1000;

    mediaElements.forEach((media: Element) => {
      const el = media as HTMLMediaElement;

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
