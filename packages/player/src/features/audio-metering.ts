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
  private sources: Map<HTMLMediaElement, MediaElementAudioSourceNode> = new Map();
  private elementListeners: Map<HTMLMediaElement, { listener: () => void, gainNode: GainNode }> = new Map();

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
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

  connect(doc: Document) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("AudioMeter: Failed to resume context", e));
    }

    const mediaElements = Array.from(doc.querySelectorAll('audio, video')) as HTMLMediaElement[];

    mediaElements.forEach(el => {
      if (this.sources.has(el)) return;

      try {
        // Create source
        const source = this.ctx.createMediaElementSource(el);
        const gainNode = this.ctx.createGain();

        // Sync initial state
        gainNode.gain.value = el.muted ? 0 : el.volume;

        // Create listener
        const listener = () => {
            try {
                gainNode.gain.value = el.muted ? 0 : el.volume;
            } catch (e) {
                // Ignore if disconnected
            }
        };
        el.addEventListener('volumechange', listener);

        // Store for cleanup
        this.elementListeners.set(el, { listener, gainNode });

        // Metering path (Pre-fader to visualize activity even if muted)
        source.connect(this.splitter);

        // Playback path (Post-fader to respect volume controls)
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        this.sources.set(el, source);
      } catch (e) {
        // This often happens if the element is already connected to another context
        // or if there's a CORS issue (though CORS usually just gives silence)
        console.warn('AudioMeter: Failed to connect element', e);
      }
    });
  }

  getLevels(): AudioLevels {
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
    this.elementListeners.forEach(({ listener, gainNode }, el) => {
        el.removeEventListener('volumechange', listener);
        try {
            gainNode.disconnect();
        } catch (e) {
            // ignore
        }
    });
    this.elementListeners.clear();

    this.sources.forEach(source => {
        try {
            source.disconnect();
        } catch (e) {
            // ignore
        }
    });
    this.sources.clear();

    try {
        this.splitter.disconnect();
        this.analyserLeft.disconnect();
        this.analyserRight.disconnect();
        this.ctx.close();
    } catch (e) {
        console.warn("AudioMeter: Error during dispose", e);
    }
  }
}
