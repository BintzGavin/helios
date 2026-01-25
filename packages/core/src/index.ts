import { TimeDriver, WaapiDriver, NoopDriver } from './drivers';

type HeliosState = {
  duration: number;
  fps: number;
  currentFrame: number;
  isPlaying: boolean;
  inputProps: Record<string, any>;
  playbackRate: number;
};

type Subscriber = (state: HeliosState) => void;

export interface HeliosOptions {
  duration: number; // in seconds
  fps: number;
  autoSyncAnimations?: boolean;
  animationScope?: HTMLElement;
  inputProps?: Record<string, any>;
  playbackRate?: number;
  driver?: TimeDriver;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  userAgent: string;
}

export * from './animation';
export * from './drivers';

export class Helios {
  private state: HeliosState;
  private subscribers: Set<Subscriber> = new Set();
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private syncWithDocumentTimeline = false;
  private autoSyncAnimations = false;
  private animationScope: HTMLElement | Document = typeof document !== 'undefined' ? document : ({} as Document);
  private driver: TimeDriver;

  static async diagnose(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      waapi: typeof document !== 'undefined' && 'timeline' in document,
      webCodecs: typeof VideoEncoder !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
    };

    console.group('Helios Diagnostics');
    console.log('WAAPI Support:', report.waapi ? '✅' : '❌');
    console.log('WebCodecs Support:', report.webCodecs ? '✅' : '❌');
    console.log('OffscreenCanvas Support:', report.offscreenCanvas ? '✅' : '❌');
    console.log('User Agent:', report.userAgent);

    if (!report.webCodecs) console.warn('Hardware accelerated rendering requires WebCodecs.');
    console.log('To verify GPU acceleration, please visit: chrome://gpu');
    console.groupEnd();

    return report;
  }

  constructor(options: HeliosOptions) {
    if (options.duration < 0) {
      throw new Error("Duration must be non-negative");
    }
    if (options.fps <= 0) {
      throw new Error("FPS must be greater than 0");
    }

    this.state = {
      duration: options.duration,
      fps: options.fps,
      currentFrame: 0,
      isPlaying: false,
      inputProps: options.inputProps || {},
      playbackRate: options.playbackRate ?? 1,
    };
    this.autoSyncAnimations = options.autoSyncAnimations || false;
    if (options.animationScope) {
      this.animationScope = options.animationScope;
    }

    // Driver Selection Strategy
    if (options.driver) {
      this.driver = options.driver;
    } else if (this.autoSyncAnimations) {
      this.driver = new WaapiDriver();
    } else {
      this.driver = new NoopDriver();
    }

    this.driver.init(this.animationScope);
  }

  // --- State Management ---
  private setState(newState: Partial<HeliosState>) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }

  public getState(): Readonly<HeliosState> {
    return this.state;
  }

  /**
   * Updates the input properties for the composition.
   * This triggers a state update and notifies subscribers.
   * @param props A record of properties to pass to the composition.
   */
  public setInputProps(props: Record<string, any>) {
    this.setState({ inputProps: props });
  }

  public setPlaybackRate(rate: number) {
    this.setState({ playbackRate: rate });
  }

  // --- Subscription ---
  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state); // Immediately notify with current state
    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: Subscriber) {
    this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber(this.state);
    }
  }

  // --- Playback Controls ---
  public play() {
    if (this.state.isPlaying) return;
    this.setState({ isPlaying: true });
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public pause() {
    if (!this.state.isPlaying) return;
    this.setState({ isPlaying: false });
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public seek(frame: number) {
    const newFrame = Math.max(0, Math.min(frame, this.state.duration * this.state.fps));
    this.setState({ currentFrame: newFrame });

    this.driver.update((newFrame / this.state.fps) * 1000);
  }

  /**
   * Binds the Helios instance to document.timeline.
   * This is useful when the timeline is being driven externally (e.g. by the Renderer).
   * Helios will poll document.timeline.currentTime and update its internal state.
   */
  public bindToDocumentTimeline() {
    if (typeof document === 'undefined' || !document.timeline) {
        console.warn('document.timeline is not available.');
        return;
    }

    this.syncWithDocumentTimeline = true;

    // Start a loop to poll the timeline
    const poll = () => {
        if (!this.syncWithDocumentTimeline) return;

        const currentTime = document.timeline.currentTime;
        if (currentTime !== null && typeof currentTime === 'number') {
            const frame = Math.round((currentTime / 1000) * this.state.fps);
            if (frame !== this.state.currentFrame) {
                 this.setState({ currentFrame: frame });
            }
        }
        requestAnimationFrame(poll);
    };

    requestAnimationFrame(poll);
  }

  public unbindFromDocumentTimeline() {
      this.syncWithDocumentTimeline = false;
  }

  private tick = () => {
    if (!this.state.isPlaying) return;

    // If we are syncing FROM document.timeline, we shouldn't drive our own loop logic
    // But play() implies we ARE driving.
    if (this.syncWithDocumentTimeline) {
        // If we are synced, we just let the poll loop handle updates.
        // But we still need to keep the loop alive if we want to support 'isPlaying' semantics
        // alongside external drivers?
        // Actually, if we are synced, 'play' might be meaningless if the external timeline isn't moving.
        this.animationFrameId = requestAnimationFrame(this.tick);
        return;
    }

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const totalFrames = this.state.duration * this.state.fps;
    const frameDelta = (deltaTime / 1000) * this.state.fps * this.state.playbackRate;
    const nextFrame = this.state.currentFrame + frameDelta;

    if (this.state.playbackRate > 0) {
      if (nextFrame >= totalFrames) {
        this.setState({ currentFrame: totalFrames - 1 });
        this.pause();
        return;
      }
    } else {
      if (nextFrame <= 0) {
        this.setState({ currentFrame: 0 });
        this.pause();
        return;
      }
    }

    this.setState({ currentFrame: nextFrame });

    this.driver.update((nextFrame / this.state.fps) * 1000);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
