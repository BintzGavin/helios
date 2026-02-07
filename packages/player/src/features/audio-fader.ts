import { SharedAudioContextManager, SharedAudioSource } from './audio-context-manager';

export class AudioFader {
  private sources: Map<HTMLMediaElement, SharedAudioSource> = new Map();
  private rafId: number | null = null;
  private manager: SharedAudioContextManager;
  private isEnabled: boolean = false;
  private observer: MutationObserver | null = null;

  constructor() {
    this.manager = SharedAudioContextManager.getInstance();
  }

  connect(doc: Document) {
    if (this.manager.context.state === 'suspended') {
      this.manager.context.resume().catch(e => console.warn("AudioFader: Failed to resume context", e));
    }

    const scanElement = (el: Element) => {
      if (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO') return;

      const mediaEl = el as HTMLMediaElement;
      const fadeIn = parseFloat(mediaEl.getAttribute('data-helios-fade-in') || '0');
      const fadeOut = parseFloat(mediaEl.getAttribute('data-helios-fade-out') || '0');

      if (fadeIn > 0 || fadeOut > 0) {
        if (!this.sources.has(mediaEl)) {
          const source = this.manager.getSharedSource(mediaEl);
          this.sources.set(mediaEl, source);
        }
      }
    };

    // Initial scan
    const elements = Array.from(doc.querySelectorAll('audio, video')) as HTMLMediaElement[];
    elements.forEach(scanElement);

    // Observer for dynamic elements
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            // Check the element itself
            scanElement(el);
            // Check children if a container was added
            const children = el.querySelectorAll('audio, video');
            children.forEach(scanElement);
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLMediaElement;
            if (this.sources.has(el)) {
              this.sources.delete(el);
            }

            // Also check children if a container was removed
             if (node instanceof Element) {
                 const descendants = node.querySelectorAll('audio, video');
                 descendants.forEach(d => {
                     const mediaEl = d as HTMLMediaElement;
                     if (this.sources.has(mediaEl)) {
                         this.sources.delete(mediaEl);
                     }
                 });
             }
          }
        });
      });
    });

    this.observer.observe(doc.body, { childList: true, subtree: true });
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
      // Check if element is still connected to DOM
      if (!el.isConnected) {
        this.sources.delete(el);
        return;
      }

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
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.sources.clear();
  }
}
