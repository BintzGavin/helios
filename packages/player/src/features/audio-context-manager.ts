export class SharedAudioSource {
  private source: MediaElementAudioSourceNode;
  private gainNode: GainNode;
  private listener: () => void;
  private element: HTMLMediaElement;

  constructor(element: HTMLMediaElement, context: AudioContext) {
    this.element = element;
    this.source = context.createMediaElementSource(element);
    this.gainNode = context.createGain();

    // Initial sync
    this.syncVolume();

    // Listener
    this.listener = () => this.syncVolume();
    element.addEventListener('volumechange', this.listener);

    // Playback path (Post-fader to respect volume controls)
    this.source.connect(this.gainNode);
    this.gainNode.connect(context.destination);
  }

  private syncVolume() {
    try {
      this.gainNode.gain.value = this.element.muted ? 0 : this.element.volume;
    } catch (e) {
      // Ignore if disconnected
    }
  }

  connect(node: AudioNode) {
    // Connect source (pre-fader) to the metering node
    try {
      this.source.connect(node);
    } catch (e) {
      // Already connected or error
    }
  }

  disconnect(node: AudioNode) {
    try {
      this.source.disconnect(node);
    } catch (e) {
      // Ignore if not connected
    }
  }
}

export class SharedAudioContextManager {
  private static instance: SharedAudioContextManager;
  public context: AudioContext;
  private sources: WeakMap<HTMLMediaElement, SharedAudioSource> = new WeakMap();

  private constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContextClass();
  }

  public static getInstance(): SharedAudioContextManager {
    if (!SharedAudioContextManager.instance) {
      SharedAudioContextManager.instance = new SharedAudioContextManager();
    }
    return SharedAudioContextManager.instance;
  }

  public getSharedSource(element: HTMLMediaElement): SharedAudioSource {
    let source = this.sources.get(element);
    if (!source) {
      source = new SharedAudioSource(element, this.context);
      this.sources.set(element, source);
    }
    return source;
  }
}
