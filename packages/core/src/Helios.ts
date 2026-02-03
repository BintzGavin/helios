import { TimeDriver, DomDriver, NoopDriver, Ticker, RafTicker, TimeoutTicker, AudioTrackMetadata } from './drivers/index.js';
import { signal, effect, computed, Signal, ReadonlySignal } from './signals.js';
import { HeliosError, HeliosErrorCode } from './errors.js';
import { HeliosSchema, validateProps, validateSchema } from './schema.js';
import { CaptionCue, parseSrt, parseCaptions, findActiveCues, areCuesEqual } from './captions.js';
import { Marker, validateMarker, validateMarkers } from './markers.js';

export type HeliosState<TInputProps = Record<string, any>> = {
  width: number;
  height: number;
  duration: number;
  fps: number;
  currentFrame: number;
  loop: boolean;
  isPlaying: boolean;
  inputProps: TInputProps;
  playbackRate: number;
  volume: number;
  muted: boolean;
  audioTracks: Record<string, AudioTrackState>;
  availableAudioTracks: AudioTrackMetadata[];
  captions: CaptionCue[];
  activeCaptions: CaptionCue[];
  markers: Marker[];
  playbackRange: [number, number] | null;
  currentTime: number;
};

export type AudioTrackState = {
  volume: number;
  muted: boolean;
};

export type HeliosSubscriber<TInputProps = Record<string, any>> = (state: HeliosState<TInputProps>) => void;

export type StabilityCheck = () => Promise<void>;

export interface HeliosOptions<TInputProps = Record<string, any>> {
  width?: number;
  height?: number;
  initialFrame?: number;
  duration: number; // in seconds
  fps: number;
  loop?: boolean;
  playbackRange?: [number, number];
  autoSyncAnimations?: boolean;
  animationScope?: unknown;
  inputProps?: TInputProps;
  schema?: HeliosSchema;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  audioTracks?: Record<string, AudioTrackState>;
  availableAudioTracks?: AudioTrackMetadata[];
  captions?: string | CaptionCue[];
  markers?: Marker[];
  driver?: TimeDriver;
  ticker?: Ticker;
}

export interface DiagnosticReport {
  waapi: boolean;
  webCodecs: boolean;
  offscreenCanvas: boolean;
  webgl: boolean;
  webgl2: boolean;
  webAudio: boolean;
  colorGamut: 'srgb' | 'p3' | 'rec2020' | null;
  videoCodecs: {
    h264: boolean;
    vp8: boolean;
    vp9: boolean;
    av1: boolean;
  };
  audioCodecs: {
    aac: boolean;
    opus: boolean;
  };
  videoDecoders: {
    h264: boolean;
    vp8: boolean;
    vp9: boolean;
    av1: boolean;
  };
  audioDecoders: {
    aac: boolean;
    opus: boolean;
  };
  userAgent: string;
}

export class Helios<TInputProps = Record<string, any>> {
  // Constants
  public readonly schema?: HeliosSchema;

  // Internal Signals
  private _duration: Signal<number>;
  private _fps: Signal<number>;
  private _currentFrame: Signal<number>;
  private _loop: Signal<boolean>;
  private _isPlaying: Signal<boolean>;
  private _inputProps: Signal<TInputProps>;
  private _playbackRate: Signal<number>;
  private _volume: Signal<number>;
  private _muted: Signal<boolean>;
  private _audioTracks: Signal<Record<string, AudioTrackState>>;
  private _availableAudioTracks: Signal<AudioTrackMetadata[]>;
  private _captions: Signal<CaptionCue[]>;
  private _activeCaptions: Signal<CaptionCue[]>;
  private _markers: Signal<Marker[]>;
  private _width: Signal<number>;
  private _height: Signal<number>;
  private _playbackRange: Signal<[number, number] | null>;
  private _currentTime: ReadonlySignal<number>;
  private _syncVersion: Signal<number>;
  private _stabilityChecks = new Set<StabilityCheck>();

  private _disposeActiveCaptionsEffect: () => void;
  private _syncDispose: (() => void) | null = null;
  private _originalVirtualTimeDescriptor: PropertyDescriptor | undefined;
  private _disposeDriverMetadataSubscription: (() => void) | null = null;
  private _reactiveVirtualTimeBound = false;

  /**
   * Returns whether Helios is successfully bound to the virtual time environment
   * via reactive setters (synchronous). If false, it may be falling back to polling (asynchronous).
   */
  public get isVirtualTimeBound(): boolean {
    return this._reactiveVirtualTimeBound;
  }

  // Public Readonly Signals

  /**
   * Signal for the current frame number.
   * Can be subscribed to for reactive updates.
   */
  public get currentFrame(): ReadonlySignal<number> { return this._currentFrame; }

  /**
   * Signal for the current time in seconds.
   * Can be subscribed to for reactive updates.
   */
  public get currentTime(): ReadonlySignal<number> { return this._currentTime; }

  /**
   * Signal for the loop state.
   * Can be subscribed to for reactive updates.
   */
  public get loop(): ReadonlySignal<boolean> { return this._loop; }

  /**
   * Signal for the playback state (playing or paused).
   * Can be subscribed to for reactive updates.
   */
  public get isPlaying(): ReadonlySignal<boolean> { return this._isPlaying; }

  /**
   * Signal for the input properties.
   * Can be subscribed to for reactive updates.
   */
  public get inputProps(): ReadonlySignal<TInputProps> { return this._inputProps; }

  /**
   * Signal for the playback rate (speed multiplier).
   * Can be subscribed to for reactive updates.
   */
  public get playbackRate(): ReadonlySignal<number> { return this._playbackRate; }

  /**
   * Signal for the audio volume (0.0 to 1.0).
   * Can be subscribed to for reactive updates.
   */
  public get volume(): ReadonlySignal<number> { return this._volume; }

  /**
   * Signal for the audio muted state.
   * Can be subscribed to for reactive updates.
   */
  public get muted(): ReadonlySignal<boolean> { return this._muted; }

  /**
   * Signal for the audio tracks state.
   * Can be subscribed to for reactive updates.
   */
  public get audioTracks(): ReadonlySignal<Record<string, AudioTrackState>> { return this._audioTracks; }

  /**
   * Signal for the available (discovered) audio tracks.
   * Can be subscribed to for reactive updates.
   */
  public get availableAudioTracks(): ReadonlySignal<AudioTrackMetadata[]> { return this._availableAudioTracks; }

  /**
   * Returns the shared AudioContext used by the driver, if supported.
   * Useful for connecting custom audio nodes for visualization.
   */
  public async getAudioContext(): Promise<unknown> {
    return this.driver.getAudioContext?.() ?? null;
  }

  /**
   * Returns a MediaElementAudioSourceNode for the specified track ID.
   * Useful for visualizing audio from a specific track.
   * @param trackId The ID of the audio track.
   */
  public async getAudioSourceNode(trackId: string): Promise<unknown> {
    return this.driver.getAudioSourceNode?.(trackId) ?? null;
  }

  /**
   * Signal for the full list of captions.
   * Can be subscribed to for reactive updates.
   */
  public get captions(): ReadonlySignal<CaptionCue[]> { return this._captions; }

  /**
   * Signal for the currently active captions.
   * Can be subscribed to for reactive updates.
   */
  public get activeCaptions(): ReadonlySignal<CaptionCue[]> {
    return this._activeCaptions;
  }

  /**
   * Signal for the timeline markers.
   * Can be subscribed to for reactive updates.
   */
  public get markers(): ReadonlySignal<Marker[]> { return this._markers; }

  /**
   * Signal for the playback range (start frame, end frame) or null if full duration.
   * Can be subscribed to for reactive updates.
   */
  public get playbackRange(): ReadonlySignal<[number, number] | null> { return this._playbackRange; }

  /**
   * Signal for the canvas width.
   * Can be subscribed to for reactive updates.
   */
  public get width(): ReadonlySignal<number> { return this._width; }

  /**
   * Signal for the canvas height.
   * Can be subscribed to for reactive updates.
   */
  public get height(): ReadonlySignal<number> { return this._height; }

  /**
   * Signal for the duration of the composition in seconds.
   * Can be subscribed to for reactive updates.
   * Access `.value` to get the current number.
   */
  public get duration(): ReadonlySignal<number> { return this._duration; }

  /**
   * Signal for the frame rate of the composition in frames per second.
   * Can be subscribed to for reactive updates.
   * Access `.value` to get the current number.
   */
  public get fps(): ReadonlySignal<number> { return this._fps; }

  // Other internals
  private syncWithDocumentTimeline = false;
  private autoSyncAnimations = false;
  private animationScope?: unknown = typeof document !== 'undefined' ? document : undefined;
  private driver: TimeDriver;
  private ticker: Ticker;
  private subscriberMap = new Map<HeliosSubscriber<TInputProps>, () => void>();

  static async diagnose(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      waapi: typeof document !== 'undefined' && 'timeline' in document,
      webCodecs: typeof VideoEncoder !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webgl: false,
      webgl2: false,
      webAudio: false,
      colorGamut: null,
      videoCodecs: {
        h264: false,
        vp8: false,
        vp9: false,
        av1: false,
      },
      audioCodecs: {
        aac: false,
        opus: false,
      },
      videoDecoders: {
        h264: false,
        vp8: false,
        vp9: false,
        av1: false,
      },
      audioDecoders: {
        aac: false,
        opus: false,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
    };

    // Check WebGL support
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        report.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl' as any));
        report.webgl2 = !!canvas.getContext('webgl2');
      } catch (e) { /* ignore */ }
    } else if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const canvas = new OffscreenCanvas(1, 1);
        report.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl' as any));
        report.webgl2 = !!canvas.getContext('webgl2');
      } catch (e) { /* ignore */ }
    }

    // Check WebAudio and Color Gamut
    if (typeof window !== 'undefined') {
      report.webAudio = 'AudioContext' in window || 'webkitAudioContext' in window;

      if (window.matchMedia) {
        if (window.matchMedia('(color-gamut: rec2020)').matches) report.colorGamut = 'rec2020';
        else if (window.matchMedia('(color-gamut: p3)').matches) report.colorGamut = 'p3';
        else if (window.matchMedia('(color-gamut: srgb)').matches) report.colorGamut = 'srgb';
      }
    }

    // Check Video Codecs
    if (typeof VideoEncoder !== 'undefined') {
      try {
        const check = async (config: any) => {
          try {
            const support = await VideoEncoder.isConfigSupported(config);
            return support.supported ?? false;
          } catch (e) {
            return false;
          }
        };

        const [h264, vp8, vp9, av1] = await Promise.all([
          check({ codec: 'avc1.42001E', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          check({ codec: 'vp8', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          check({ codec: 'vp09.00.10.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          check({ codec: 'av01.0.04M.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 })
        ]);

        report.videoCodecs = { h264, vp8, vp9, av1 };
      } catch (e) {
        // Ignore errors during codec check
      }
    }

    // Check Audio Codecs
    if (typeof AudioEncoder !== 'undefined') {
      try {
        const checkAudio = async (config: any) => {
          try {
            const support = await AudioEncoder.isConfigSupported(config);
            return support.supported ?? false;
          } catch (e) {
            return false;
          }
        };

        const [aac, opus] = await Promise.all([
          checkAudio({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }),
          checkAudio({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })
        ]);

        report.audioCodecs = { aac, opus };
      } catch (e) {
        // Ignore errors during codec check
      }
    }

    // Check Video Decoders
    if (typeof VideoDecoder !== 'undefined') {
      try {
        const checkDecoder = async (config: any) => {
          try {
            const support = await VideoDecoder.isConfigSupported(config);
            return support.supported ?? false;
          } catch (e) {
            return false;
          }
        };

        const [h264, vp8, vp9, av1] = await Promise.all([
          checkDecoder({ codec: 'avc1.42001E', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          checkDecoder({ codec: 'vp8', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          checkDecoder({ codec: 'vp09.00.10.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 }),
          checkDecoder({ codec: 'av01.0.04M.08', width: 1920, height: 1080, bitrate: 2_000_000, framerate: 30 })
        ]);

        report.videoDecoders = { h264, vp8, vp9, av1 };
      } catch (e) {
        // Ignore errors during codec check
      }
    }

    // Check Audio Decoders
    if (typeof AudioDecoder !== 'undefined') {
      try {
        const checkAudioDecoder = async (config: any) => {
          try {
            const support = await AudioDecoder.isConfigSupported(config);
            return support.supported ?? false;
          } catch (e) {
            return false;
          }
        };

        const [aac, opus] = await Promise.all([
          checkAudioDecoder({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }),
          checkAudioDecoder({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })
        ]);

        report.audioDecoders = { aac, opus };
      } catch (e) {
        // Ignore errors during codec check
      }
    }

    return report;
  }

  constructor(options: HeliosOptions<TInputProps>) {
    if (options.duration < 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_DURATION,
        "Duration must be non-negative",
        "Ensure the 'duration' option passed to the Helios constructor is >= 0."
      );
    }
    if (options.fps <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_FPS,
        "FPS must be greater than 0",
        "Ensure the 'fps' option passed to the Helios constructor is > 0."
      );
    }

    const width = options.width ?? 1920;
    const height = options.height ?? 1080;

    if (width <= 0 || height <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_RESOLUTION,
        "Resolution must be positive",
        "Ensure the 'width' and 'height' options are greater than 0."
      );
    }

    this.schema = options.schema;

    // Validate the schema definition itself (check defaults)
    validateSchema(this.schema);

    const initialProps = validateProps(options.inputProps || {}, this.schema) as TInputProps;
    const initialCaptions = options.captions
      ? (typeof options.captions === 'string' ? parseCaptions(options.captions) : options.captions)
      : [];

    const initialMarkers = options.markers ? validateMarkers(options.markers) : [];

    // Initialize Initial Frame
    const totalFrames = options.duration * options.fps;
    const initialFrameRaw = options.initialFrame || 0;
    const initialFrame = Math.max(0, Math.min(initialFrameRaw, totalFrames));

    if (options.playbackRange) {
        const [start, end] = options.playbackRange;
        if (start < 0 || end <= start) {
            throw new HeliosError(
                HeliosErrorCode.INVALID_PLAYBACK_RANGE,
                `Invalid playback range: [${start}, ${end}]`,
                "Ensure start >= 0 and end > start."
            );
        }
    }

    // Initialize signals
    this._duration = signal(options.duration);
    this._fps = signal(options.fps);
    this._currentFrame = signal(initialFrame);
    this._loop = signal(options.loop ?? false);
    this._isPlaying = signal(false);
    this._inputProps = signal(initialProps);
    this._playbackRate = signal(options.playbackRate ?? 1);
    this._volume = signal(options.volume ?? 1);
    this._muted = signal(options.muted ?? false);
    this._audioTracks = signal(options.audioTracks || {});
    this._availableAudioTracks = signal(options.availableAudioTracks || []);
    this._captions = signal(initialCaptions);
    this._markers = signal(initialMarkers);
    this._width = signal(width);
    this._height = signal(height);
    this._playbackRange = signal(options.playbackRange || null);
    this._syncVersion = signal(0);

    this._currentTime = computed(() => this._currentFrame.value / this._fps.value);

    this._activeCaptions = signal(findActiveCues(initialCaptions, 0));

    this._disposeActiveCaptionsEffect = effect(() => {
      const timeMs = (this._currentFrame.value / this._fps.value) * 1000;
      const active = findActiveCues(this._captions.value, timeMs);

      if (!areCuesEqual(active, this._activeCaptions.peek())) {
        this._activeCaptions.value = active;
      }
    });

    this.autoSyncAnimations = options.autoSyncAnimations || false;
    if (options.animationScope) {
      this.animationScope = options.animationScope;
    }

    // Driver Selection Strategy
    if (options.driver) {
      this.driver = options.driver;
    } else if (this.autoSyncAnimations) {
      this.driver = new DomDriver();
    } else {
      this.driver = new NoopDriver();
    }

    this.driver.init(this.animationScope);

    if (this.driver.subscribeToMetadata) {
      this._disposeDriverMetadataSubscription = this.driver.subscribeToMetadata((meta) => {
        if (meta.audioTracks) {
          this._availableAudioTracks.value = meta.audioTracks;
        }
      });
    }

    // Sync driver with initial state
    this.driver.update((this._currentFrame.value / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.value,
      playbackRate: this._playbackRate.value,
      volume: this._volume.value,
      muted: this._muted.value,
      audioTracks: this._audioTracks.value
    });

    // Ticker Selection
    this.ticker = options.ticker || (typeof requestAnimationFrame !== 'undefined' ? new RafTicker() : new TimeoutTicker());
  }

  public getState(): Readonly<HeliosState<TInputProps>> {
    // Read sync version to allow forced updates via dependency tracking
    this._syncVersion.value;

    return {
      width: this._width.value,
      height: this._height.value,
      duration: this._duration.value,
      fps: this._fps.value,
      currentFrame: this._currentFrame.value,
      loop: this._loop.value,
      isPlaying: this._isPlaying.value,
      inputProps: this._inputProps.value,
      playbackRate: this._playbackRate.value,
      volume: this._volume.value,
      muted: this._muted.value,
      audioTracks: this._audioTracks.value,
      availableAudioTracks: this._availableAudioTracks.value,
      captions: this._captions.value,
      activeCaptions: this.activeCaptions.value,
      markers: this._markers.value,
      playbackRange: this._playbackRange.value,
      currentTime: this._currentTime.value,
    };
  }

  public setSize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_RESOLUTION,
        "Resolution must be positive",
        "Ensure the 'width' and 'height' passed to setSize are greater than 0."
      );
    }
    this._width.value = width;
    this._height.value = height;
  }

  public setLoop(shouldLoop: boolean) {
    this._loop.value = shouldLoop;
  }

  /**
   * Updates the duration of the composition in seconds.
   * If the new duration is shorter than the current playback time, the current frame will be clamped.
   * @param seconds The new duration in seconds (must be non-negative).
   */
  public setDuration(seconds: number) {
    if (seconds < 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_DURATION,
        "Duration must be non-negative",
        "Ensure the duration passed to setDuration is >= 0."
      );
    }
    this._duration.value = seconds;

    const totalFrames = seconds * this._fps.value;
    // Clamp current frame if it exceeds new duration
    if (this._currentFrame.peek() > totalFrames) {
      this.seek(totalFrames);
    } else {
      this.driver.update((this._currentFrame.peek() / this._fps.value) * 1000, {
        isPlaying: this._isPlaying.peek(),
        playbackRate: this._playbackRate.peek(),
        volume: this._volume.peek(),
        muted: this._muted.peek(),
        audioTracks: this._audioTracks.peek()
      });
    }
  }

  /**
   * Updates the frame rate of the composition.
   * This preserves the current playback time in seconds, adjusting the current frame number accordingly.
   * @param fps The new frame rate (must be greater than 0).
   */
  public setFps(fps: number) {
    if (fps <= 0) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_FPS,
        "FPS must be greater than 0",
        "Ensure the fps passed to setFps is > 0."
      );
    }
    const oldFps = this._fps.value;
    const currentTime = this._currentFrame.peek() / oldFps;

    this._fps.value = fps;

    // Recalculate frame to match time
    this._currentFrame.value = currentTime * fps;

    this.driver.update(currentTime * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });
  }

  /**
   * Updates the input properties for the composition.
   * This triggers a state update and notifies subscribers.
   * @param props A record of properties to pass to the composition.
   */
  public setInputProps(props: TInputProps) {
    this._inputProps.value = validateProps(props, this.schema);
  }

  public setPlaybackRate(rate: number) {
    this._playbackRate.value = rate;
  }

  public setAudioVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this._volume.value = clamped;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: clamped,
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });
  }

  public setAudioMuted(muted: boolean) {
    this._muted.value = muted;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: muted,
      audioTracks: this._audioTracks.peek()
    });
  }

  public setAudioTrackVolume(trackId: string, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    const currentTracks = this._audioTracks.peek();
    const track = currentTracks[trackId] || { volume: 1, muted: false };

    this._audioTracks.value = {
      ...currentTracks,
      [trackId]: { ...track, volume: clamped }
    };

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.value
    });
  }

  public setAudioTrackMuted(trackId: string, muted: boolean) {
    const currentTracks = this._audioTracks.peek();
    const track = currentTracks[trackId] || { volume: 1, muted: false };

    this._audioTracks.value = {
      ...currentTracks,
      [trackId]: { ...track, muted }
    };

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.value
    });
  }

  /**
   * Updates the available audio tracks manually.
   * Useful for headless environments where tracks cannot be discovered from the DOM.
   * @param tracks The list of audio tracks to expose.
   */
  public setAvailableAudioTracks(tracks: AudioTrackMetadata[]) {
    this._availableAudioTracks.value = tracks;
  }

  /**
   * Updates the captions for the composition.
   * @param captions SRT/WebVTT string or array of CaptionCue objects.
   */
  public setCaptions(captions: string | CaptionCue[]) {
    const cues = typeof captions === 'string' ? parseCaptions(captions) : captions;
    this._captions.value = cues;
  }

  public setMarkers(markers: Marker[]) {
    this._markers.value = validateMarkers(markers);
  }

  public addMarker(marker: Marker) {
    const valid = validateMarker(marker);
    const current = this._markers.peek();

    if (current.some((m) => m.id === valid.id)) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_MARKER,
        `Duplicate marker ID: ${valid.id}`,
        'Ensure all markers have unique IDs.'
      );
    }

    const newMarkers = [...current, valid].sort((a, b) => a.time - b.time);
    this._markers.value = newMarkers;
  }

  public removeMarker(id: string) {
    const current = this._markers.peek();
    const newMarkers = current.filter((m) => m.id !== id);
    if (newMarkers.length !== current.length) {
      this._markers.value = newMarkers;
    }
  }

  public seekToMarker(id: string) {
    const marker = this._markers.peek().find((m) => m.id === id);
    if (!marker) {
      throw new HeliosError(
        HeliosErrorCode.MARKER_NOT_FOUND,
        `Marker not found: ${id}`,
        'Ensure the marker ID exists before seeking.'
      );
    }
    const frame = marker.time * this._fps.value;
    this.seek(frame);
  }

  /**
   * Seeks to a specific time in seconds.
   * This is a convenience wrapper around seek(frame).
   * @param seconds The time in seconds to seek to.
   */
  public seekToTime(seconds: number) {
    const frame = seconds * this._fps.value;
    this.seek(frame);
  }

  public setPlaybackRange(startFrame: number, endFrame: number) {
    if (startFrame < 0 || endFrame <= startFrame) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_PLAYBACK_RANGE,
        `Invalid playback range: [${startFrame}, ${endFrame}]`,
        "Ensure start >= 0 and end > start."
      );
    }
    this._playbackRange.value = [startFrame, endFrame];
  }

  public clearPlaybackRange() {
    this._playbackRange.value = null;
  }

  // --- Subscription ---
  public subscribe(callback: HeliosSubscriber<TInputProps>): () => void {
    const dispose = effect(() => {
      callback(this.getState());
    });

    this.subscriberMap.set(callback, dispose);

    return () => this.unsubscribe(callback);
  }

  public unsubscribe(callback: HeliosSubscriber<TInputProps>) {
    const dispose = this.subscriberMap.get(callback);
    if (dispose) {
      dispose();
      this.subscriberMap.delete(callback);
    }
  }

  // --- Stability Registry ---

  /**
   * Registers a custom stability check.
   * This uses the Observer pattern to allow external systems to block the `waitUntilStable` promise
   * until they are ready. The check function should return a Promise that resolves when the custom system is stable.
   *
   * @param check The async function to run during waitUntilStable.
   * @returns A disposal function to unregister the check.
   * @public
   */
  public registerStabilityCheck(check: StabilityCheck): () => void {
    this._stabilityChecks.add(check);
    return () => {
      this._stabilityChecks.delete(check);
    };
  }

  // --- Playback Controls ---
  public play() {
    if (this._isPlaying.peek()) return;
    this._isPlaying.value = true;

    // Sync driver immediately
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: true,
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });

    this.ticker.start(this.onTick);
  }

  public pause() {
    if (!this._isPlaying.peek()) return;
    this._isPlaying.value = false;
    this.ticker.stop();

    // Sync driver to ensure media is paused
    const currentFrame = this._currentFrame.peek();
    this.driver.update((currentFrame / this._fps.value) * 1000, {
      isPlaying: false,
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });
  }

  public seek(frame: number) {
    const newFrame = Math.max(0, Math.min(frame, this._duration.value * this._fps.value));
    this._currentFrame.value = newFrame;

    this.driver.update((newFrame / this._fps.value) * 1000, {
      isPlaying: this._isPlaying.peek(),
      playbackRate: this._playbackRate.peek(),
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });
  }

  /**
   * Waits for the composition to stabilize.
   * This ensures that all asynchronous operations (like image loading, font loading,
   * and media seeking) triggered by the last seek/update are complete.
   *
   * This method waits for the primary driver (e.g., DomDriver) and all registered
   * stability checks in parallel.
   *
   * Useful for deterministic rendering.
   * @returns Promise that resolves when all stability checks are complete.
   * @public
   */
  public async waitUntilStable(): Promise<void> {
    const driverPromise = this.driver.waitUntilStable();
    // Execute all registered stability checks
    const checks = Array.from(this._stabilityChecks);
    const checkPromises = checks.map((check) => check());

    // Virtual Time Sync Check
    // Ensures that if we are being driven by __HELIOS_VIRTUAL_TIME__, we wait until our internal state matches.
    // This handles cases where reactive binding failed (fallback to polling) or there is a race condition.
    const virtualTimePromise = new Promise<void>((resolve) => {
      if (!this.syncWithDocumentTimeline || typeof window === 'undefined') {
        resolve();
        return;
      }

      const checkSync = () => {
        // If we stopped syncing, abort check
        if (!this.syncWithDocumentTimeline) {
          resolve();
          return;
        }

        const virtualTime = (window as any).__HELIOS_VIRTUAL_TIME__;
        // If not defined or not finite, skip sync check
        if (typeof virtualTime !== 'number' || !Number.isFinite(virtualTime)) {
          resolve();
          return;
        }

        const rawTargetFrame = (virtualTime / 1000) * this._fps.value;
        const totalFrames = this._duration.value * this._fps.value;
        // Clamp target frame to valid range, as Helios internally clamps currentFrame
        const targetFrame = Math.max(0, Math.min(rawTargetFrame, totalFrames));

        // Tolerance 0.01 frame
        if (Math.abs(targetFrame - this._currentFrame.peek()) <= 0.01) {
          resolve();
        } else {
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(checkSync);
          } else {
            setTimeout(checkSync, 10);
          }
        }
      };
      checkSync();
    });

    await Promise.all([driverPromise, ...checkPromises, virtualTimePromise]);
  }

  public bindTo(master: Helios<any>) {
    this.disposeSync();
    this.unbindFromDocumentTimeline();
    this.ticker.stop();

    this._syncDispose = effect(() => {
      const time = master.currentTime.value;
      const fps = this._fps.value;
      const masterPlaying = master.isPlaying.value;
      const masterRate = master.playbackRate.value;

      // Sync state
      this._currentFrame.value = time * fps;
      this._isPlaying.value = masterPlaying;
      this._playbackRate.value = masterRate;

      // Update driver immediately
      this.driver.update(time * 1000, {
        isPlaying: masterPlaying,
        playbackRate: masterRate,
        volume: this._volume.peek(),
        muted: this._muted.peek(),
        audioTracks: this._audioTracks.peek()
      });
    });
  }

  public unbind() {
    this.disposeSync();
    this.unbindFromDocumentTimeline();
  }

  /**
   * Binds the Helios instance to document.timeline.
   * This is useful when the timeline is being driven externally (e.g. by the Renderer).
   * Helios will poll document.timeline.currentTime and update its internal state.
   */
  public bindToDocumentTimeline() {
    if (this.syncWithDocumentTimeline) return;

    if (typeof document === 'undefined' || !document.timeline) {
      console.warn('document.timeline is not available.');
      return;
    }

    this.syncWithDocumentTimeline = true;

    // Reactive Virtual Time Binding
    if (typeof window !== 'undefined') {
      let virtualTimeValue: number | null = null;

      // Check if property already exists to preserve it
      this._originalVirtualTimeDescriptor = Object.getOwnPropertyDescriptor(window, '__HELIOS_VIRTUAL_TIME__');

      // If it has a value, capture it
      if (typeof (window as any).__HELIOS_VIRTUAL_TIME__ === 'number') {
        virtualTimeValue = (window as any).__HELIOS_VIRTUAL_TIME__;
      }

      try {
        Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', {
          configurable: true,
          enumerable: true,
          get: () => virtualTimeValue,
          set: (value: number) => {
            virtualTimeValue = value;
            if (!this.syncWithDocumentTimeline) return;

            if (Number.isFinite(value)) {
              const frame = (value / 1000) * this._fps.value;
              if (frame !== this._currentFrame.peek()) {
                this._currentFrame.value = frame;
              } else {
                // Force notification to ensure subscribers are synced even if frame matches.
                // This is critical for external drivers (like SeekTimeDriver) that rely on
                // the "set" event to synchronize other systems (like GSAP timelines).
                this._syncVersion.value++;
              }

              this.driver.update(value, {
                isPlaying: false,
                playbackRate: this._playbackRate.peek(),
                volume: this._volume.peek(),
                muted: this._muted.peek(),
                audioTracks: this._audioTracks.peek()
              });
            }
          }
        });

        this._reactiveVirtualTimeBound = true;

        // Trigger initial update if value exists
        if (virtualTimeValue !== null) {
          (window as any).__HELIOS_VIRTUAL_TIME__ = virtualTimeValue;
        }
      } catch (e) {
        console.warn(
          'Failed to bind reactive virtual time. Helios will fall back to polling, which may affect synchronization accuracy. ' +
          'This usually happens if __HELIOS_VIRTUAL_TIME__ is already defined as non-configurable.',
          e
        );
      }
    }

    // Start a loop to poll the timeline (fallback)
    const poll = () => {
      if (!this.syncWithDocumentTimeline) return;

      let currentTime: number | null = null;

      // Check if virtual time is active. If so, we skip polling document.timeline
      // because the setter handles it.
      if (typeof window !== 'undefined') {
        const virtualTime = (window as any).__HELIOS_VIRTUAL_TIME__;
        if (typeof virtualTime === 'number' && Number.isFinite(virtualTime)) {
          if (this._reactiveVirtualTimeBound) {
            // Virtual time is active and reactively bound, setter handles logic.
            if (typeof requestAnimationFrame !== 'undefined') {
              requestAnimationFrame(poll);
            }
            return;
          } else {
            // Virtual time is present but not bound reactively (e.g. defineProperty failed).
            // We must poll it manually.
            currentTime = virtualTime;
          }
        }
      }

      // Fallback to document timeline if no virtual time
      if (currentTime === null) {
        const tlTime = document.timeline.currentTime;
        if (tlTime !== null && typeof tlTime === 'number') {
          currentTime = tlTime;
        }
      }

      if (currentTime !== null) {
        const frame = (currentTime / 1000) * this._fps.value;
        if (frame !== this._currentFrame.peek()) {
          this._currentFrame.value = frame;
        }

        this.driver.update(currentTime, {
          isPlaying: false,
          playbackRate: this._playbackRate.peek(),
          volume: this._volume.peek(),
          muted: this._muted.peek(),
          audioTracks: this._audioTracks.peek()
        });
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(poll);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(poll);
    }
  }

  public unbindFromDocumentTimeline() {
    this.syncWithDocumentTimeline = false;

    if (typeof window !== 'undefined') {
      if (this._originalVirtualTimeDescriptor) {
        Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', this._originalVirtualTimeDescriptor);
        this._originalVirtualTimeDescriptor = undefined;
      } else {
        // If we defined it, remove it
        delete (window as any).__HELIOS_VIRTUAL_TIME__;
      }
    }
  }

  public dispose() {
    this.pause();
    this.ticker.stop();
    this.unbind();
    this.driver.dispose?.();
    this._disposeActiveCaptionsEffect?.();
    this._disposeDriverMetadataSubscription?.();

    this.subscriberMap.forEach((dispose) => dispose());
    this.subscriberMap.clear();
    this._stabilityChecks.clear();
  }

  private disposeSync() {
    if (this._syncDispose) {
      this._syncDispose();
      this._syncDispose = null;
    }
  }

  private onTick = (deltaTime: number) => {
    if (!this._isPlaying.peek()) return;

    // If we are syncing FROM document.timeline, we shouldn't drive our own loop logic
    if (this.syncWithDocumentTimeline) {
        return;
    }

    const totalFrames = this._duration.value * this._fps.value;
    const playbackRate = this._playbackRate.peek();
    const frameDelta = (deltaTime / 1000) * this._fps.value * playbackRate;
    const nextFrame = this._currentFrame.peek() + frameDelta;
    const shouldLoop = this._loop.peek();
    const range = this._playbackRange.peek();

    const startFrame = range ? range[0] : 0;
    const endFrame = range ? range[1] : totalFrames;
    const rangeDuration = endFrame - startFrame;

    if (shouldLoop && rangeDuration > 0) {
      if (playbackRate > 0 && nextFrame >= endFrame) {
        // Wrap around
        const overflow = nextFrame - startFrame;
        this._currentFrame.value = startFrame + (overflow % rangeDuration);
      } else if (playbackRate < 0 && nextFrame < startFrame) {
        // Wrap around
        const overflow = nextFrame - startFrame;
        // JS modulo of negative is negative, so add rangeDuration to ensure positive
        this._currentFrame.value = startFrame + (rangeDuration + (overflow % rangeDuration)) % rangeDuration;
      } else {
        this._currentFrame.value = nextFrame;
      }
    } else {
      if (playbackRate > 0) {
        if (nextFrame >= endFrame) {
          this._currentFrame.value = Math.max(startFrame, Math.min(nextFrame, endFrame));
          if (this._currentFrame.value === endFrame) {
            this.pause();
            return;
          }
        } else {
          this._currentFrame.value = nextFrame;
        }
      } else {
        if (nextFrame <= startFrame) {
          this._currentFrame.value = startFrame;
          this.pause();
          return;
        } else {
             this._currentFrame.value = nextFrame;
        }
      }
    }

    this.driver.update((this._currentFrame.peek() / this._fps.value) * 1000, {
      isPlaying: true,
      playbackRate,
      volume: this._volume.peek(),
      muted: this._muted.peek(),
      audioTracks: this._audioTracks.peek()
    });
  }
}
