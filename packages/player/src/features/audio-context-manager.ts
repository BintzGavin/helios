export class SharedAudioSource {
  private source: MediaElementAudioSourceNode;
  private fadeGainNode: GainNode;
  private gainNode: GainNode;
  private listener: () => void;
  private element: HTMLMediaElement;

  constructor(element: HTMLMediaElement, context: AudioContext) {
    this.element = element;
    this.source = context.createMediaElementSource(element);
    this.fadeGainNode = context.createGain(); // For fades (composition)
    this.gainNode = context.createGain();     // For volume (user control)

    // Initial sync
    this.syncVolume();

    // Listener
    this.listener = () => this.syncVolume();
    element.addEventListener('volumechange', this.listener);

    // Playback path: Source -> Fade -> Volume -> Destination
    this.source.connect(this.fadeGainNode);
    this.fadeGainNode.connect(this.gainNode);
    this.gainNode.connect(context.destination);
  }

  public setFadeGain(value: number) {
    try {
      // Use setTargetAtTime for smooth transition to avoid clicks
      // time constant 0.01 provides fast but smooth updates
      this.fadeGainNode.gain.setTargetAtTime(value, this.fadeGainNode.context.currentTime, 0.01);
    } catch (e) {
      // Ignore
    }
  }

  private syncVolume() {
    try {
      this.gainNode.gain.value = this.element.muted ? 0 : this.element.volume;
    } catch (e) {
      // Ignore if disconnected
    }
  }

  connect(node: AudioNode) {
    // Connect post-fade (but pre-volume) to the metering node
    // This ensures meter reflects composition fades but not user volume
    try {
      this.fadeGainNode.connect(node);
    } catch (e) {
      // Already connected or error
    }
  }

  disconnect(node: AudioNode) {
    try {
      this.fadeGainNode.disconnect(node);
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
