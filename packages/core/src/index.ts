import { TimeDriver, WaapiDriver, NoopDriver } from './drivers';
import { signal, effect, Signal, ReadonlySignal } from './signals';

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
export * from './easing';
export * from './sequencing';
export * from './signals';

export class Helios {
  // Constants
  public readonly duration: number;
  public readonly fps: number;

  // Internal Signals
  private _currentFrame: Signal<number>;
  private _isPlaying: Signal<boolean>;
  private _inputProps: Signal<Record<string, any>>;
  private _playbackRate: Signal<number>;

  // Public Readonly Signals

  /**
   * Signal for the current frame number.
   * Can be subscribed to for reactive updates.
   */
  public get currentFrame(): ReadonlySignal<number> { return this._currentFrame; }

  /**
   * Signal for the playback state (playing or paused).
   * Can be subscribed to for reactive updates.
   */
  public get isPlaying(): ReadonlySignal<boolean> { return this._isPlaying; }

  /**
   * Signal for the input properties.
   * Can be subscribed to for reactive updates.
   */
  public get inputProps(): ReadonlySignal<Record<string, any>> { return this._inputProps; }

  /**
   * Signal for the playback rate (speed multiplier).
   * Can be subscribed to for reactive updates.
   */
  public get playbackRate(): ReadonlySignal<number> { return this._playbackRate; }

  // Other internals
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private syncWithDocumentTimeline = false;
  private autoSyncAnimations = false;
  private animationScope: HTMLElement | Document = typeof document !== 'undefined' ? document : ({} as Document);
  private driver: TimeDriver;
  private subscriberMap = new Map<Subscriber, () => void>();

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

    this.duration = options.duration;
    this.fps = options.fps;

    // Initialize signals
    this._currentFrame = signal(0);
    this._isPlaying = signal(false);
    this._inputProps = signal(options.inputProps || {});
    this._playbackRate = signal(options.playbackRate ?? 1);

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

  public getState(): Readonly<HeliosState> {
    return {
      duration: this.duration,
      fps: this.fps,
      currentFrame: this._currentFrame.value,
      isPlaying: this._isPlaying.value,
      inputProps: this._inputProps.value,
      playbackRate: this._playbackRate.value,
    };
  }

  /**
   * Updates the input properties for the composition.
   * This triggers a state update and notifies subscribers.
   * @param props A record of properties to pass to the composition.
   */
  public setInputProps(props: Record<string, any>) {
    this._inputProps.value = props;
  }

  public setPlaybackRate(rate: number) {
    this._playbackRate.value = rate;
  }

  // --- Subscription ---
  public subscribe(callback: Subscriber): () => void {
    const dispose = effect(() => {
      callback(this.getState());
    });

    this.subscriberMap.set(callback, dispose);

    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: Subscriber) {
    const dispose = this.subscriberMap.get(callback);
    if (dispose) {
      dispose();
      this.subscriberMap.delete(callback);
    }
  }

  // --- Playback Controls ---
  public play() {
    if (this._isPlaying.peek()) return;
    this._isPlaying.value = true;
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public pause() {
    if (!this._isPlaying.peek()) return;
    this._isPlaying.value = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public seek(frame: number) {
    const newFrame = Math.max(0, Math.min(frame, this.duration * this.fps));
    this._currentFrame.value = newFrame;

    this.driver.update((newFrame / this.fps) * 1000);
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
            const frame = Math.round((currentTime / 1000) * this.fps);
            if (frame !== this._currentFrame.peek()) {
                 this._currentFrame.value = frame;
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
    if (!this._isPlaying.peek()) return;

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

    const totalFrames = this.duration * this.fps;
    const playbackRate = this._playbackRate.peek();
    const frameDelta = (deltaTime / 1000) * this.fps * playbackRate;
    const nextFrame = this._currentFrame.peek() + frameDelta;

    if (playbackRate > 0) {
      if (nextFrame >= totalFrames) {
        this._currentFrame.value = totalFrames - 1;
        this.pause();
        return;
      }
    } else {
      if (nextFrame <= 0) {
        this._currentFrame.value = 0;
        this.pause();
        return;
      }
    }

    this._currentFrame.value = nextFrame;

    this.driver.update((nextFrame / this.fps) * 1000);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
