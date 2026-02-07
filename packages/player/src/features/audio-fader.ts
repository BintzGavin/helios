import { SharedAudioContextManager, SharedAudioSource } from './audio-context-manager';

export class AudioFader {
  private sources: Map<HTMLMediaElement, SharedAudioSource> = new Map();
  private rafId: number | null = null;
  private manager: SharedAudioContextManager;
  private isEnabled: boolean = false;

  constructor() {
    this.manager = SharedAudioContextManager.getInstance();
  }

  connect(doc: Document) {
    if (this.manager.context.state === 'suspended') {
      this.manager.context.resume().catch(e => console.warn("AudioFader: Failed to resume context", e));
    }

    const elements = Array.from(doc.querySelectorAll('audio, video')) as HTMLMediaElement[];

    elements.forEach(el => {
      const fadeIn = parseFloat(el.getAttribute('data-helios-fade-in') || '0');
      const fadeOut = parseFloat(el.getAttribute('data-helios-fade-out') || '0');

      if (fadeIn > 0 || fadeOut > 0) {
        if (!this.sources.has(el)) {
          const source = this.manager.getSharedSource(el);
          this.sources.set(el, source);
        }
      }
    });
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.loop();
  }

  disable() {
    this.isEnabled = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = () => {
    if (!this.isEnabled) return;

    this.sources.forEach((source, el) => {
      const fadeIn = parseFloat(el.getAttribute('data-helios-fade-in') || '0');
      const fadeOut = parseFloat(el.getAttribute('data-helios-fade-out') || '0');
      const duration = el.duration;
      const currentTime = el.currentTime;

      let gain = 1;

      // Calculate Fade In
      if (fadeIn > 0 && currentTime < fadeIn) {
        gain = currentTime / fadeIn;
      }

      // Calculate Fade Out
      if (fadeOut > 0 && duration > 0) {
        const remaining = duration - currentTime;
        if (remaining < fadeOut) {
             const fadeOutGain = Math.max(0, remaining / fadeOut);
             gain = Math.min(gain, fadeOutGain);
        }
      }

      // Apply to source
      source.setFadeGain(gain);
    });

    this.rafId = requestAnimationFrame(this.loop);
  }

  dispose() {
    this.disable();
    this.sources.clear();
  }
}
