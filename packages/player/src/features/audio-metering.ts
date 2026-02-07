import { SharedAudioContextManager, SharedAudioSource } from './audio-context-manager';

export interface AudioLevels {
  left: number;
  right: number;
  peakLeft: number;
  peakRight: number;
}

export class AudioMeter {
  private ctx: AudioContext;
  private splitter: ChannelSplitterNode;
  private analyserLeft: AnalyserNode;
  private analyserRight: AnalyserNode;
  private dataArrayLeft: Float32Array;
  private dataArrayRight: Float32Array;
  private sources: Map<HTMLMediaElement, SharedAudioSource> = new Map();
  private isEnabled: boolean = false;
  private manager: SharedAudioContextManager;
  private observer: MutationObserver | null = null;

  constructor() {
    this.manager = SharedAudioContextManager.getInstance();
    this.ctx = this.manager.context;

    this.splitter = this.ctx.createChannelSplitter(2);
    this.analyserLeft = this.ctx.createAnalyser();
    this.analyserRight = this.ctx.createAnalyser();

    // Use a small buffer for responsiveness
    this.analyserLeft.fftSize = 256;
    this.analyserRight.fftSize = 256;

    this.dataArrayLeft = new Float32Array(this.analyserLeft.fftSize);
    this.dataArrayRight = new Float32Array(this.analyserRight.fftSize);

    this.splitter.connect(this.analyserLeft, 0);
    this.splitter.connect(this.analyserRight, 1);
  }

  connect(doc: Document | ShadowRoot) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("AudioMeter: Failed to resume context", e));
    }

    const scanElement = (el: Element) => {
      if (el.tagName !== 'AUDIO' && el.tagName !== 'VIDEO') return;
      const mediaEl = el as HTMLMediaElement;
      this.connectElement(mediaEl);
    };

    // Initial scan
    const mediaElements = Array.from(doc.querySelectorAll('audio, video')) as HTMLMediaElement[];
    mediaElements.forEach(el => this.connectElement(el));

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
            children.forEach(child => scanElement(child));
          }
        });

        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') {
                this.disconnectElement(el as HTMLMediaElement);
            }

            // Also check children if a container was removed
            const descendants = el.querySelectorAll('audio, video');
            descendants.forEach(d => {
                this.disconnectElement(d as HTMLMediaElement);
            });
          }
        });
      });
    });

    const target = (doc as Document).body || doc;
    this.observer.observe(target, { childList: true, subtree: true });
  }

  private connectElement(el: HTMLMediaElement) {
      if (this.sources.has(el)) return;

      try {
        const sharedSource = this.manager.getSharedSource(el);

        // Metering path (Pre-fader to visualize activity even if muted)
        // Only connect if enabled
        if (this.isEnabled) {
            sharedSource.connect(this.splitter);
        }

        this.sources.set(el, sharedSource);
      } catch (e) {
        console.warn('AudioMeter: Failed to connect element', e);
      }
  }

  private disconnectElement(el: HTMLMediaElement) {
      const source = this.sources.get(el);
      if (source) {
          source.disconnect(this.splitter);
          this.sources.delete(el);
      }
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("AudioMeter: Failed to resume context", e));
    }

    this.sources.forEach(source => {
        source.connect(this.splitter);
    });
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    this.sources.forEach(source => {
        source.disconnect(this.splitter);
    });
  }

  getLevels(): AudioLevels {
    if (!this.isEnabled) {
        return { left: 0, right: 0, peakLeft: 0, peakRight: 0 };
    }

    this.analyserLeft.getFloatTimeDomainData(this.dataArrayLeft as any);
    this.analyserRight.getFloatTimeDomainData(this.dataArrayRight as any);

    return {
      left: this.calculateRMS(this.dataArrayLeft),
      right: this.calculateRMS(this.dataArrayRight),
      peakLeft: this.calculatePeak(this.dataArrayLeft),
      peakRight: this.calculatePeak(this.dataArrayRight)
    };
  }

  private calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  private calculatePeak(data: Float32Array): number {
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i]);
      if (val > max) max = val;
    }
    return max;
  }

  dispose() {
    if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
    }

    this.sources.forEach(source => {
        source.disconnect(this.splitter);
    });
    this.sources.clear();

    try {
        this.splitter.disconnect();
        this.analyserLeft.disconnect();
        this.analyserRight.disconnect();
    } catch (e) {
        console.warn("AudioMeter: Error during dispose", e);
    }
  }
}
