import { Helios, HeliosSchema, DiagnosticReport } from "@helios-project/core";
import { DirectController, BridgeController } from "./controllers";
import type { HeliosController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";
import { HeliosTextTrack, HeliosTextTrackList, CueClass, TrackHost } from "./features/text-tracks";
import { parseCaptions } from "./features/caption-parser";

export { ClientSideExporter };
export type { HeliosController };

// Helper to match MediaError interface if not globally available in all envs
interface MediaError {
  readonly code: number;
  readonly message: string;
  readonly MEDIA_ERR_ABORTED: number;
  readonly MEDIA_ERR_NETWORK: number;
  readonly MEDIA_ERR_DECODE: number;
  readonly MEDIA_ERR_SRC_NOT_SUPPORTED: number;
}

class StaticTimeRange implements TimeRanges {
  constructor(private startVal: number, private endVal: number) {}

  get length() {
    return this.endVal > 0 ? 1 : 0;
  }

  start(index: number) {
    if (index !== 0 || this.length === 0) throw new Error("IndexSizeError");
    return this.startVal;
  }

  end(index: number) {
    if (index !== 0 || this.length === 0) throw new Error("IndexSizeError");
    return this.endVal;
  }
}

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      background-color: #f0f0f0;
      position: relative;
      font-family: var(--helios-font-family, sans-serif);

      /* CSS Variables for Theming */
      --helios-controls-bg: rgba(0, 0, 0, 0.6);
      --helios-text-color: white;
      --helios-accent-color: #007bff;
      --helios-range-track-color: #555;
      --helios-range-selected-color: rgba(255, 255, 255, 0.2);
      --helios-range-unselected-color: var(--helios-range-track-color);
      --helios-font-family: sans-serif;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--helios-controls-bg);
      display: flex;
      align-items: center;
      padding: 8px;
      color: var(--helios-text-color);
      transition: opacity 0.3s;
      z-index: 2;
    }
    :host(:not([controls])) .controls {
      display: none;
      pointer-events: none;
    }
    .play-pause-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 24px;
      cursor: pointer;
      width: 40px;
      height: 40px;
    }
    .volume-control {
      display: flex;
      align-items: center;
      margin-right: 8px;
    }
    .volume-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .volume-slider {
      width: 60px;
      margin-left: 4px;
      height: 4px;
      -webkit-appearance: none;
      background: var(--helios-range-track-color);
      outline: none;
      border-radius: 2px;
    }
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: var(--helios-text-color);
      cursor: pointer;
      border-radius: 50%;
    }
    .export-btn {
      background-color: var(--helios-accent-color);
      border: none;
      color: var(--helios-text-color);
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 6px 12px;
      margin: 0 10px;
      border-radius: 4px;
    }
    .export-btn:hover {
      filter: brightness(0.9);
    }
    .export-btn:disabled {
      background-color: #666;
      cursor: not-allowed;
    }
    .scrubber-wrapper {
      flex-grow: 1;
      margin: 0 16px;
      position: relative;
      height: 8px;
      display: flex;
      align-items: center;
    }
    .scrubber {
      width: 100%;
      height: 100%;
      margin: 0;
      position: relative;
      z-index: 1;
      -webkit-appearance: none;
      background: var(--helios-range-track-color);
      outline: none;
      opacity: 0.9;
      transition: opacity .2s;
    }
    .scrubber::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: var(--helios-accent-color);
      cursor: pointer;
      border-radius: 50%;
    }
    .scrubber-tooltip {
      position: absolute;
      bottom: 100%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
      margin-bottom: 8px;
    }
    .scrubber-tooltip.hidden {
      display: none;
    }
    .markers-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
    }
    .marker {
      position: absolute;
      width: 4px;
      height: 12px;
      background-color: var(--helios-accent-color);
      transform: translateX(-50%);
      cursor: pointer;
      pointer-events: auto;
      border-radius: 2px;
      top: -2px;
      transition: transform 0.1s;
    }
    .marker:hover {
      transform: translateX(-50%) scale(1.2);
      z-index: 10;
    }
    .time-display {
      min-width: 90px;
      text-align: center;
    }
    .status-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.3s;
    }
    .status-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .error-msg {
      color: #ff6b6b;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .retry-btn {
      background-color: #ff6b6b;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .retry-btn:hover {
      background-color: #ff5252;
    }
    .speed-selector {
      background: rgba(0, 0, 0, 0.4);
      color: var(--helios-text-color);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 4px;
      padding: 4px 8px;
      margin-left: 8px;
      font-size: 12px;
      cursor: pointer;
    }
    .speed-selector:hover {
      background: rgba(0, 0, 0, 0.6);
    }
    .speed-selector:focus {
      outline: none;
      border-color: var(--helios-accent-color);
    }
    .fullscreen-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin-left: 8px;
    }
    .fullscreen-btn:hover {
      color: var(--helios-accent-color);
    }
    .pip-video {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }
    .pip-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin-left: 8px;
    }
    .pip-btn:hover {
      color: var(--helios-accent-color);
    }
    .captions-container {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      text-align: center;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      z-index: 5;
    }
    .caption-cue {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 16px;
      text-shadow: 0 1px 2px black;
      white-space: pre-wrap;
    }
    .cc-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      opacity: 0.7;
    }
    .cc-btn:hover {
      opacity: 1;
    }
    .cc-btn.active {
      opacity: 1;
      color: var(--helios-accent-color);
      border-bottom: 2px solid var(--helios-accent-color);
    }
    .poster-container {
      position: absolute;
      inset: 0;
      background-color: black;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .poster-container.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .poster-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.6;
    }
    .big-play-btn {
      position: relative;
      z-index: 10;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid white;
      border-radius: 50%;
      width: 80px;
      height: 80px;
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .big-play-btn:hover {
        transform: scale(1.1);
    }

    .click-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: transparent;
    }
    :host([interactive]) .click-layer {
      pointer-events: none;
    }

    /* Responsive Layouts */
    .controls.layout-compact .volume-slider {
      display: none;
    }
    .controls.layout-tiny .volume-slider {
      display: none;
    }
    .controls.layout-tiny .speed-selector {
      display: none;
    }
    slot {
      display: none;
    }

    /* Diagnostics UI */
    .debug-overlay {
      position: absolute;
      inset: 20px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid var(--helios-range-track-color);
      border-radius: 8px;
      color: var(--helios-text-color);
      z-index: 100;
      display: flex;
      flex-direction: column;
      font-family: monospace;
      font-size: 12px;
      backdrop-filter: blur(4px);
    }
    .debug-overlay.hidden {
      display: none;
    }
    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--helios-range-track-color);
      background: rgba(255, 255, 255, 0.05);
    }
    .debug-title {
      font-weight: bold;
      font-size: 14px;
    }
    .close-debug-btn {
      background: none;
      border: none;
      color: var(--helios-text-color);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    .close-debug-btn:hover {
      color: var(--helios-accent-color);
    }
    .debug-content {
      flex: 1;
      overflow: auto;
      padding: 12px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .debug-actions {
      padding: 8px 12px;
      border-top: 1px solid var(--helios-range-track-color);
      display: flex;
      justify-content: flex-end;
      background: rgba(255, 255, 255, 0.05);
    }
    .copy-debug-btn {
      background: var(--helios-accent-color);
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-debug-btn:hover {
      filter: brightness(0.9);
    }
  </style>
  <slot></slot>
  <div class="debug-overlay hidden" part="debug-overlay">
    <div class="debug-header">
      <span class="debug-title">Diagnostics</span>
      <button class="close-debug-btn" aria-label="Close diagnostics">×</button>
    </div>
    <pre class="debug-content"></pre>
    <div class="debug-actions">
      <button class="copy-debug-btn">Copy to Clipboard</button>
    </div>
  </div>
  <div class="status-overlay hidden" part="overlay">
    <div class="status-text">Connecting...</div>
    <button class="retry-btn" style="display: none">Retry</button>
  </div>
  <div class="poster-container hidden" part="poster">
    <img class="poster-image" alt="Video poster" />
    <div class="big-play-btn" aria-label="Play video">▶</div>
  </div>
  <video class="pip-video" playsinline muted autoplay></video>
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin" title="Helios Composition Preview"></iframe>
  <div class="click-layer" part="click-layer"></div>
  <div class="captions-container" part="captions"></div>
  <div class="controls" role="toolbar" aria-label="Playback Controls">
    <button class="play-pause-btn" part="play-pause-button" aria-label="Play">▶</button>
    <div class="volume-control">
      <button class="volume-btn" part="volume-button" aria-label="Mute">🔊</button>
      <input type="range" class="volume-slider" min="0" max="1" step="0.05" value="1" part="volume-slider" aria-label="Volume">
    </div>
    <button class="cc-btn" part="cc-button" aria-label="Toggle Captions">CC</button>
    <button class="export-btn" part="export-button" aria-label="Export video">Export</button>
    <select class="speed-selector" part="speed-selector" aria-label="Playback speed">
      <option value="0.25">0.25x</option>
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
    </select>
    <div class="scrubber-wrapper">
      <div class="scrubber-tooltip hidden" part="tooltip"></div>
      <div class="markers-container" part="markers"></div>
      <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber" aria-label="Seek time">
    </div>
    <div class="time-display" part="time-display">0.00 / 0.00</div>
    <button class="fullscreen-btn" part="fullscreen-button" aria-label="Toggle fullscreen">⛶</button>
    <button class="pip-btn" part="pip-button" aria-label="Picture-in-Picture">⏏</button>
  </div>
`;

export class HeliosPlayer extends HTMLElement implements TrackHost {
  private iframe: HTMLIFrameElement;
  private pipVideo: HTMLVideoElement;
  private _textTracks: HeliosTextTrackList;
  private _domTracks = new Map<HTMLTrackElement, HeliosTextTrack>();
  private playPauseBtn: HTMLButtonElement;
  private volumeBtn: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private scrubber: HTMLInputElement;
  private scrubberWrapper: HTMLDivElement;
  private scrubberTooltip: HTMLDivElement;
  private markersContainer: HTMLDivElement;
  private timeDisplay: HTMLDivElement;
  private exportBtn: HTMLButtonElement;
  private overlay: HTMLElement;
  private statusText: HTMLElement;
  private retryBtn: HTMLButtonElement;
  private retryAction: () => void;
  private speedSelector: HTMLSelectElement;
  private fullscreenBtn: HTMLButtonElement;
  private pipBtn: HTMLButtonElement;
  private captionsContainer: HTMLDivElement;
  private ccBtn: HTMLButtonElement;
  private showCaptions: boolean = false;
  private lastCaptionsHash: string = "";

  // Diagnostics UI
  private debugOverlay: HTMLElement;
  private debugContent: HTMLElement;
  private closeDebugBtn: HTMLButtonElement;
  private copyDebugBtn: HTMLButtonElement;

  private clickLayer: HTMLDivElement;
  private posterContainer: HTMLDivElement;
  private posterImage: HTMLImageElement;
  private bigPlayBtn: HTMLDivElement;
  private pendingSrc: string | null = null;
  private isLoaded: boolean = false;

  private resizeObserver: ResizeObserver;
  private controller: HeliosController | null = null;
  // Keep track if we have direct access (optional, mainly for debugging/logging)
  private directHelios: Helios | null = null;
  private unsubscribe: (() => void) | null = null;
  private connectionInterval: number | null = null;
  private abortController: AbortController | null = null;
  private isExporting: boolean = false;
  private isScrubbing: boolean = false;
  private wasPlayingBeforeScrub: boolean = false;
  private lastState: any = null;
  private pendingProps: Record<string, any> | null = null;
  private _error: MediaError | null = null;

  // Persistence for properties set before connection
  private _pendingVolume: number = 1;
  private _pendingPlaybackRate: number = 1;
  private _pendingMuted: boolean | null = null;

  // --- Standard Media API States ---

  public static readonly HAVE_NOTHING = 0;
  public static readonly HAVE_METADATA = 1;
  public static readonly HAVE_CURRENT_DATA = 2;
  public static readonly HAVE_FUTURE_DATA = 3;
  public static readonly HAVE_ENOUGH_DATA = 4;

  public static readonly NETWORK_EMPTY = 0;
  public static readonly NETWORK_IDLE = 1;
  public static readonly NETWORK_LOADING = 2;
  public static readonly NETWORK_NO_SOURCE = 3;

  private _readyState: number = HeliosPlayer.HAVE_NOTHING;
  private _networkState: number = HeliosPlayer.NETWORK_EMPTY;

  public get readyState(): number {
    return this._readyState;
  }

  public get networkState(): number {
    return this._networkState;
  }

  public get error(): MediaError | null {
    return this._error;
  }

  public get currentSrc(): string {
    return this.src;
  }

  // --- Standard Media API ---

  public canPlayType(type: string): CanPlayTypeResult {
    // We strictly play Helios compositions, not standard video MIME types.
    // Return empty string to be spec-compliant for video/mp4 etc.
    return "";
  }

  public get defaultMuted(): boolean {
    return this.hasAttribute("muted");
  }

  public set defaultMuted(val: boolean) {
    if (val) {
      this.setAttribute("muted", "");
    } else {
      this.removeAttribute("muted");
    }
  }

  private _defaultPlaybackRate = 1.0;
  public get defaultPlaybackRate(): number {
    return this._defaultPlaybackRate;
  }

  public set defaultPlaybackRate(val: number) {
    if (this._defaultPlaybackRate !== val) {
      this._defaultPlaybackRate = val;
      this.dispatchEvent(new Event("ratechange"));
    }
  }

  private _preservesPitch = true;
  public get preservesPitch(): boolean {
    return this._preservesPitch;
  }

  public set preservesPitch(val: boolean) {
    this._preservesPitch = val;
  }

  public get srcObject(): MediaProvider | null {
    return null;
  }

  public set srcObject(val: MediaProvider | null) {
    console.warn("HeliosPlayer does not support srcObject");
  }

  public get crossOrigin(): string | null {
    return this.getAttribute("crossorigin");
  }

  public set crossOrigin(val: string | null) {
    if (val !== null) {
      this.setAttribute("crossorigin", val);
    } else {
      this.removeAttribute("crossorigin");
    }
  }

  public get seeking(): boolean {
    // Return internal scrubbing state as seeking
    return this.isScrubbing;
  }

  public get buffered(): TimeRanges {
    return new StaticTimeRange(0, this.duration);
  }

  public get seekable(): TimeRanges {
    return new StaticTimeRange(0, this.duration);
  }

  public get played(): TimeRanges {
    // Standard Media API: played range matches duration
    return new StaticTimeRange(0, this.duration);
  }

  public get videoWidth(): number {
    if (this.controller) {
      const state = this.controller.getState();
      if (state.width) return state.width;
    }
    return parseFloat(this.getAttribute("width") || "0");
  }

  public get videoHeight(): number {
    if (this.controller) {
      const state = this.controller.getState();
      if (state.height) return state.height;
    }
    return parseFloat(this.getAttribute("height") || "0");
  }

  public get currentTime(): number {
    if (!this.controller) return 0;
    const s = this.controller.getState();
    return s.fps ? s.currentFrame / s.fps : 0;
  }

  public set currentTime(val: number) {
    if (this.controller) {
      const s = this.controller.getState();
      if (s.fps) {
        // Dispatch events to satisfy Standard Media API expectations
        this.dispatchEvent(new Event("seeking"));
        this.controller.seek(Math.floor(val * s.fps));
        this.dispatchEvent(new Event("seeked"));
      }
    }
  }

  public get currentFrame(): number {
    return this.controller ? this.controller.getState().currentFrame : 0;
  }

  public set currentFrame(val: number) {
    if (this.controller) {
      // Dispatch events to satisfy Standard Media API expectations
      this.dispatchEvent(new Event("seeking"));
      this.controller.seek(Math.floor(val));
      this.dispatchEvent(new Event("seeked"));
    }
  }

  public get duration(): number {
    return this.controller ? this.controller.getState().duration : 0;
  }

  public get paused(): boolean {
    return this.controller ? !this.controller.getState().isPlaying : true;
  }

  public get ended(): boolean {
    if (!this.controller) return false;
    const s = this.controller.getState();
    return s.currentFrame >= s.duration * s.fps - 1;
  }

  public get volume(): number {
    if (this.controller) {
      return this.controller.getState().volume ?? this._pendingVolume;
    }
    return this._pendingVolume;
  }

  public set volume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this._pendingVolume = clamped;
    if (this.controller) {
      this.controller.setAudioVolume(clamped);
    }
  }

  public get muted(): boolean {
    if (this.controller) {
      return !!this.controller.getState().muted;
    }
    // If pendingMuted is explicitly set, return it.
    // Otherwise fallback to attribute presence (default behavior).
    return this._pendingMuted !== null ? this._pendingMuted : this.hasAttribute("muted");
  }

  public set muted(val: boolean) {
    this._pendingMuted = val;
    if (this.controller) {
      this.controller.setAudioMuted(val);
    }
  }

  public get interactive(): boolean {
    return this.hasAttribute("interactive");
  }

  public set interactive(val: boolean) {
    if (val) {
      this.setAttribute("interactive", "");
    } else {
      this.removeAttribute("interactive");
    }
  }

  public get playbackRate(): number {
    if (this.controller) {
      return this.controller.getState().playbackRate ?? this._pendingPlaybackRate;
    }
    return this._pendingPlaybackRate;
  }

  public set playbackRate(val: number) {
    this._pendingPlaybackRate = val;
    if (this.controller) {
      this.controller.setPlaybackRate(val);
    }
  }

  public get fps(): number {
    return this.controller ? this.controller.getState().fps : 0;
  }

  public get src(): string {
    return this.getAttribute("src") || "";
  }

  public set src(val: string) {
    this.setAttribute("src", val);
  }

  public get autoplay(): boolean {
    return this.hasAttribute("autoplay");
  }

  public set autoplay(val: boolean) {
    if (val) {
      this.setAttribute("autoplay", "");
    } else {
      this.removeAttribute("autoplay");
    }
  }

  public get loop(): boolean {
    return this.hasAttribute("loop");
  }

  public set loop(val: boolean) {
    if (val) {
      this.setAttribute("loop", "");
    } else {
      this.removeAttribute("loop");
    }
  }

  public get controls(): boolean {
    return this.hasAttribute("controls");
  }

  public set controls(val: boolean) {
    if (val) {
      this.setAttribute("controls", "");
    } else {
      this.removeAttribute("controls");
    }
  }

  public get poster(): string {
    return this.getAttribute("poster") || "";
  }

  public set poster(val: string) {
    this.setAttribute("poster", val);
  }

  public get preload(): string {
    return this.getAttribute("preload") || "auto";
  }

  public set preload(val: string) {
    this.setAttribute("preload", val);
  }

  public get sandbox(): string {
    return this.getAttribute("sandbox") || "allow-scripts allow-same-origin";
  }

  public set sandbox(val: string) {
    this.setAttribute("sandbox", val);
  }

  public get disablePictureInPicture(): boolean {
    return this.hasAttribute("disablepictureinpicture");
  }

  public set disablePictureInPicture(val: boolean) {
    if (val) {
      this.setAttribute("disablepictureinpicture", "");
    } else {
      this.removeAttribute("disablepictureinpicture");
    }
  }

  public async requestPictureInPicture(): Promise<PictureInPictureWindow> {
    if (!document.pictureInPictureEnabled) {
      throw new Error("Picture-in-Picture not supported");
    }

    // Try to find the canvas
    let canvas: HTMLCanvasElement | null = null;
    try {
        const doc = this.iframe.contentDocument || (this.iframe.contentWindow as any)?.document;
        if (doc) {
            const selector = this.getAttribute("canvas-selector") || "canvas";
            canvas = doc.querySelector(selector);
        }
    } catch (e) {
        // Access denied
    }

    if (!canvas) {
        throw new Error("No canvas found for Picture-in-Picture (requires same-origin access).");
    }

    const stream = canvas.captureStream(this.fps || 30);
    this.pipVideo.srcObject = stream;
    await this.pipVideo.play();
    return this.pipVideo.requestPictureInPicture();
  }

  private togglePip() {
    if (document.pictureInPictureElement) {
       document.exitPictureInPicture();
    } else {
       this.requestPictureInPicture().catch(e => {
           console.warn("HeliosPlayer: PiP failed", e);
       });
    }
  }

  private onEnterPip = () => {
    this.pipBtn.style.color = "var(--helios-accent-color)";
    this.dispatchEvent(new Event("enterpictureinpicture"));
  };

  private onLeavePip = () => {
    this.pipBtn.style.removeProperty("color");
    this.pipVideo.pause();
    this.dispatchEvent(new Event("leavepictureinpicture"));
  };

  public async play(): Promise<void> {
    if (!this.isLoaded) {
      this.setAttribute("autoplay", "");
      this.load();
    } else if (this.controller) {
      this.controller.play();
    }
  }

  public load(): void {
    if (this.pendingSrc) {
      const src = this.pendingSrc;
      this.pendingSrc = null;
      this.loadIframe(src);
    } else {
      const src = this.getAttribute("src");
      if (src) {
        this.loadIframe(src);
      }
    }
  }

  public pause(): void {
    if (this.controller) {
      this.controller.pause();
    }
  }

  static get observedAttributes() {
    return ["src", "width", "height", "autoplay", "loop", "controls", "export-format", "input-props", "poster", "muted", "interactive", "preload", "controlslist", "sandbox", "export-caption-mode", "disablepictureinpicture", "export-width", "export-height", "export-bitrate", "export-filename"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.iframe = this.shadowRoot!.querySelector("iframe")!;
    this.playPauseBtn = this.shadowRoot!.querySelector(".play-pause-btn")!;
    this.volumeBtn = this.shadowRoot!.querySelector(".volume-btn")!;
    this.volumeSlider = this.shadowRoot!.querySelector(".volume-slider")!;
    this.scrubber = this.shadowRoot!.querySelector(".scrubber")!;
    this.scrubberWrapper = this.shadowRoot!.querySelector(".scrubber-wrapper")!;
    this.scrubberTooltip = this.shadowRoot!.querySelector(".scrubber-tooltip")!;
    this.markersContainer = this.shadowRoot!.querySelector(".markers-container")!;
    this.timeDisplay = this.shadowRoot!.querySelector(".time-display")!;
    this.exportBtn = this.shadowRoot!.querySelector(".export-btn")!;
    this.overlay = this.shadowRoot!.querySelector(".status-overlay")!;
    this.statusText = this.shadowRoot!.querySelector(".status-text")!;
    this.retryBtn = this.shadowRoot!.querySelector(".retry-btn")!;
    this.speedSelector = this.shadowRoot!.querySelector(".speed-selector")!;
    this.fullscreenBtn = this.shadowRoot!.querySelector(".fullscreen-btn")!;
    this.pipBtn = this.shadowRoot!.querySelector(".pip-btn")!;
    this.captionsContainer = this.shadowRoot!.querySelector(".captions-container")!;
    this.ccBtn = this.shadowRoot!.querySelector(".cc-btn")!;

    this.debugOverlay = this.shadowRoot!.querySelector(".debug-overlay")!;
    this.debugContent = this.shadowRoot!.querySelector(".debug-content")!;
    this.closeDebugBtn = this.shadowRoot!.querySelector(".close-debug-btn")!;
    this.copyDebugBtn = this.shadowRoot!.querySelector(".copy-debug-btn")!;

    this.pipVideo = this.shadowRoot!.querySelector(".pip-video")!;

    this.clickLayer = this.shadowRoot!.querySelector(".click-layer")!;
    this.posterContainer = this.shadowRoot!.querySelector(".poster-container")!;
    this.posterImage = this.shadowRoot!.querySelector(".poster-image")!;
    this.bigPlayBtn = this.shadowRoot!.querySelector(".big-play-btn")!;

    this.retryAction = () => this.retryConnection();
    this.retryBtn.onclick = () => this.retryAction();

    this.clickLayer.addEventListener("click", () => {
      this.focus();
      this.togglePlayPause();
    });
    this.clickLayer.addEventListener("dblclick", () => this.toggleFullscreen());

    this._textTracks = new HeliosTextTrackList();
    this._textTracks.addEventListener("addtrack", () => this.updateCCButtonVisibility());
    this._textTracks.addEventListener("removetrack", () => this.updateCCButtonVisibility());

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const controls = this.shadowRoot!.querySelector(".controls");
        if (controls) {
          controls.classList.toggle("layout-compact", width < 500);
          controls.classList.toggle("layout-tiny", width < 350);
        }
      }
    });
  }

  public get textTracks(): HeliosTextTrackList {
    return this._textTracks;
  }

  public addTextTrack(kind: string, label: string = "", language: string = ""): HeliosTextTrack {
    const track = new HeliosTextTrack(kind, label, language, this);
    this._textTracks.addTrack(track);
    return track;
  }

  public handleTrackModeChange(track: HeliosTextTrack) {
    if (!this.controller) return;

    if (track.mode === 'showing') {
        // Enforce mutual exclusivity for 'captions'
        if (track.kind === 'captions') {
            for (const t of this._textTracks) {
                if (t !== track && t.kind === 'captions' && t.mode === 'showing') {
                    t.mode = 'hidden';
                }
            }
        }

        // Extract cues into the format Helios expects
        const captions = track.cues.map((cue: any, index: number) => ({
            id: cue.id || String(index + 1),
            startTime: cue.startTime * 1000, // Convert seconds to milliseconds
            endTime: cue.endTime * 1000,     // Convert seconds to milliseconds
            text: cue.text
        }));
        this.controller.setCaptions(captions);
    } else {
        // If hiding/disabling, check if any other track is showing
        const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
        if (showingTrack) {
             const captions = showingTrack.cues.map((cue: any, index: number) => ({
                id: cue.id || String(index + 1),
                startTime: cue.startTime * 1000, // Convert seconds to milliseconds
                endTime: cue.endTime * 1000,     // Convert seconds to milliseconds
                text: cue.text
            }));
             this.controller.setCaptions(captions);
        } else {
             this.controller.setCaptions([]);
        }
    }
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;

    if (name === "poster") {
      this.posterImage.src = newVal;
      this.updatePosterVisibility();
    }

    if (name === "src") {
      const preload = this.getAttribute("preload") || "auto";
      if (preload === "none" && !this.isLoaded) {
        this.pendingSrc = newVal;
        this.updatePosterVisibility();
        // Hide loading/connecting status since we are deferring load
        this.hideStatus();
      } else {
        this.loadIframe(newVal);
      }
    }

    if (name === "width" || name === "height") {
      this.updateAspectRatio();
    }

    if (name === "loop") {
      if (this.controller) {
        this.controller.setLoop(this.hasAttribute("loop"));
      }
    }

    if (name === "input-props") {
      try {
        const props = JSON.parse(newVal);
        this.pendingProps = props;
        if (this.controller) {
          this.controller.setInputProps(props);
        }
      } catch (e) {
        console.warn("HeliosPlayer: Invalid JSON in input-props", e);
      }
    }

    if (name === "muted") {
      if (this.controller) {
        this.controller.setAudioMuted(this.hasAttribute("muted"));
      }
    }

    if (name === "controlslist" || name === "disablepictureinpicture") {
      this.updateControlsVisibility();
    }

    if (name === "sandbox") {
      const newValOrNull = this.getAttribute("sandbox");
      // If attribute is missing (null), use default.
      // If present (even if empty string ""), use it as is.
      const flags = newValOrNull === null ? "allow-scripts allow-same-origin" : newValOrNull;

      if (this.iframe.getAttribute("sandbox") !== flags) {
        this.iframe.setAttribute("sandbox", flags);

        // If we have a source, we must reload for new sandbox flags to apply
        if (this.getAttribute("src")) {
           this.loadIframe(this.getAttribute("src")!);
        }
      }
    }
  }

  private updateControlsVisibility() {
    if (!this.exportBtn || !this.fullscreenBtn) return;

    const attr = this.getAttribute("controlslist") || "";
    const tokens = attr.toLowerCase().split(/\s+/);

    if (tokens.includes("nodownload")) {
      this.exportBtn.style.display = "none";
    } else {
      this.exportBtn.style.removeProperty("display");
    }

    if (tokens.includes("nofullscreen")) {
      this.fullscreenBtn.style.display = "none";
    } else {
      this.fullscreenBtn.style.removeProperty("display");
    }

    if (this.hasAttribute("disablepictureinpicture")) {
      this.pipBtn.style.display = "none";
    } else {
      this.pipBtn.style.removeProperty("display");
    }
  }

  private updateCCButtonVisibility() {
    // Smart Controls: Hide CC button if no tracks are present
    if (this._textTracks.length > 0) {
        this.ccBtn.style.removeProperty("display");
    } else {
        this.ccBtn.style.display = "none";
    }
  }

  public get inputProps(): Record<string, any> | null {
    return this.pendingProps;
  }

  public set inputProps(val: Record<string, any> | null) {
    this.pendingProps = val;
    if (this.controller && val) {
      this.controller.setInputProps(val);
    }
  }

  connectedCallback() {
    this.setAttribute("tabindex", "0");
    this.iframe.addEventListener("load", this.handleIframeLoad);
    window.addEventListener("message", this.handleWindowMessage);
    this.addEventListener("keydown", this.handleKeydown);
    document.addEventListener("fullscreenchange", this.updateFullscreenUI);

    this.playPauseBtn.addEventListener("click", this.togglePlayPause);
    this.volumeBtn.addEventListener("click", this.toggleMute);
    this.volumeSlider.addEventListener("input", this.handleVolumeInput);
    this.scrubber.addEventListener("input", this.handleScrubberInput);
    this.scrubber.addEventListener("mousedown", this.handleScrubStart);
    this.scrubber.addEventListener("change", this.handleScrubEnd);
    this.scrubber.addEventListener("touchstart", this.handleScrubStart, { passive: true });
    this.scrubber.addEventListener("touchend", this.handleScrubEnd);
    this.scrubber.addEventListener("touchcancel", this.handleScrubEnd);
    this.scrubberWrapper.addEventListener("mousemove", this.handleScrubberHover);
    this.scrubberWrapper.addEventListener("mouseleave", this.handleScrubberLeave);
    this.exportBtn.addEventListener("click", this.renderClientSide);
    this.speedSelector.addEventListener("change", this.handleSpeedChange);
    this.fullscreenBtn.addEventListener("click", this.toggleFullscreen);
    this.pipBtn.addEventListener("click", () => this.togglePip());
    this.ccBtn.addEventListener("click", this.toggleCaptions);
    this.bigPlayBtn.addEventListener("click", this.handleBigPlayClick);
    this.pipVideo.addEventListener("enterpictureinpicture", this.onEnterPip);
    this.pipVideo.addEventListener("leavepictureinpicture", this.onLeavePip);
    this.posterContainer.addEventListener("click", this.handleBigPlayClick);

    this.closeDebugBtn.addEventListener("click", this.toggleDiagnostics);
    this.copyDebugBtn.addEventListener("click", this.handleCopyDebug);

    const slot = this.shadowRoot!.querySelector("slot");
    if (slot) {
        slot.addEventListener("slotchange", this.handleSlotChange);
        // Initial check
        this.handleSlotChange();
    }

    // Initial state: disabled until connected
    this.setControlsDisabled(true);

    // Ensure sandbox flags are correct on connect (handling if attribute was present before upgrade)
    const sandboxAttr = this.getAttribute("sandbox");
    const sandboxFlags = sandboxAttr === null ? "allow-scripts allow-same-origin" : sandboxAttr;
    if (this.iframe.getAttribute("sandbox") !== sandboxFlags) {
        this.iframe.setAttribute("sandbox", sandboxFlags);
    }

    // Only show connecting if we haven't already shown "Loading..." via attributeChangedCallback
    // AND we are not deferring load (pendingSrc is null)
    // AND we don't have a poster (which should take precedence visually)
    if (this.overlay.classList.contains("hidden") && !this.pendingSrc && !this.hasAttribute("poster")) {
        this.showStatus("Connecting...", false);
    }

    if (this.pendingSrc) {
       this.updatePosterVisibility();
    }

    // Ensure aspect ratio is correct on connect
    this.updateAspectRatio();

    this.updateControlsVisibility();
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    this.iframe.removeEventListener("load", this.handleIframeLoad);
    window.removeEventListener("message", this.handleWindowMessage);
    this.removeEventListener("keydown", this.handleKeydown);
    document.removeEventListener("fullscreenchange", this.updateFullscreenUI);
    this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
    this.volumeBtn.removeEventListener("click", this.toggleMute);
    this.volumeSlider.removeEventListener("input", this.handleVolumeInput);
    this.scrubber.removeEventListener("input", this.handleScrubberInput);
    this.scrubber.removeEventListener("mousedown", this.handleScrubStart);
    this.scrubber.removeEventListener("change", this.handleScrubEnd);
    this.scrubber.removeEventListener("touchstart", this.handleScrubStart);
    this.scrubber.removeEventListener("touchend", this.handleScrubEnd);
    this.scrubber.removeEventListener("touchcancel", this.handleScrubEnd);
    this.scrubberWrapper.removeEventListener("mousemove", this.handleScrubberHover);
    this.scrubberWrapper.removeEventListener("mouseleave", this.handleScrubberLeave);
    this.exportBtn.removeEventListener("click", this.renderClientSide);
    this.speedSelector.removeEventListener("change", this.handleSpeedChange);
    this.fullscreenBtn.removeEventListener("click", this.toggleFullscreen);
    this.ccBtn.removeEventListener("click", this.toggleCaptions);
    this.bigPlayBtn.removeEventListener("click", this.handleBigPlayClick);
    this.pipVideo.removeEventListener("enterpictureinpicture", this.onEnterPip);
    this.pipVideo.removeEventListener("leavepictureinpicture", this.onLeavePip);
    this.posterContainer.removeEventListener("click", this.handleBigPlayClick);

    this.closeDebugBtn.removeEventListener("click", this.toggleDiagnostics);
    this.copyDebugBtn.removeEventListener("click", this.handleCopyDebug);

    const slot = this.shadowRoot!.querySelector("slot");
    if (slot) {
        slot.removeEventListener("slotchange", this.handleSlotChange);
    }

    this.stopConnectionAttempts();

    if (this.unsubscribe) {
        this.unsubscribe();
    }
    if (this.controller) {
        this.controller.pause();
        this.controller.dispose();
    }
  }

  private loadIframe(src: string) {
    this._error = null;
    this._networkState = HeliosPlayer.NETWORK_LOADING;
    this._readyState = HeliosPlayer.HAVE_NOTHING;
    this.dispatchEvent(new Event('loadstart'));

    this.iframe.src = src;
    this.isLoaded = true;
    if (this.controller) {
      this.controller.pause();
      this.controller.dispose();
      this.controller = null;
    }
    this.setControlsDisabled(true);
    // Only show status if no poster, to avoid flashing/overlaying
    if (!this.hasAttribute("poster")) {
      this.showStatus("Loading...", false);
    }
    this.updatePosterVisibility();
  }

  private handleBigPlayClick = () => {
     this.load();
     // If we are already loaded, just play
     if (this.controller) {
       this.controller.play();
     } else {
       // Set autoplay so the controller will play once connected
       this.setAttribute("autoplay", "");
     }
  }

  private updatePosterVisibility() {
    if (this.pendingSrc) {
      this.posterContainer.classList.remove("hidden");
      return;
    }

    if (this.hasAttribute("poster")) {
      let shouldHide = false;
      if (this.controller) {
        const state = this.controller.getState();
        if (state.isPlaying || state.currentFrame > 0) {
          shouldHide = true;
        }
      }

      if (shouldHide) {
        this.posterContainer.classList.add("hidden");
      } else {
        this.posterContainer.classList.remove("hidden");
      }
    } else {
      this.posterContainer.classList.add("hidden");
    }
  }

  private setControlsDisabled(disabled: boolean) {
      this.playPauseBtn.disabled = disabled;
      this.volumeBtn.disabled = disabled;
      this.volumeSlider.disabled = disabled;
      this.scrubber.disabled = disabled;
      this.speedSelector.disabled = disabled;
      this.fullscreenBtn.disabled = disabled;
      this.pipBtn.disabled = disabled;
      this.ccBtn.disabled = disabled;
      // Export is managed separately based on connection state
      if (disabled) {
          this.exportBtn.disabled = true;
      }
  }

  private lockPlaybackControls(locked: boolean) {
      this.playPauseBtn.disabled = locked;
      this.volumeBtn.disabled = locked;
      this.volumeSlider.disabled = locked;
      this.scrubber.disabled = locked;
      this.speedSelector.disabled = locked;
      this.fullscreenBtn.disabled = locked;
      this.pipBtn.disabled = locked;
      this.ccBtn.disabled = locked;
  }

  private handleIframeLoad = () => {
    if (!this.iframe.contentWindow) return;
    this.startConnectionAttempts();
  };

  private startConnectionAttempts() {
    this.stopConnectionAttempts();

    // 1. Bridge Mode (Fire and forget, wait for message)
    // We send this immediately so if the iframe is listening it can respond.
    this.iframe.contentWindow?.postMessage({ type: 'HELIOS_CONNECT' }, '*');

    // 2. Direct Mode (Polling)
    const checkDirect = () => {
      let directInstance: Helios | undefined;
      try {
        directInstance = (this.iframe.contentWindow as any).helios as Helios | undefined;
      } catch (e) {
        // Access denied (Cross-origin)
      }

      if (directInstance) {
        console.log("HeliosPlayer: Connected via Direct Mode.");
        this.stopConnectionAttempts();
        this.hideStatus();
        this.directHelios = directInstance;
        this.setController(new DirectController(directInstance, this.iframe));
        this.exportBtn.disabled = false;
        return true;
      }
      return false;
    };

    // Check immediately to avoid unnecessary delay
    if (checkDirect()) return;

    // We poll because window.helios might be set asynchronously.
    const startTime = Date.now();
    this.connectionInterval = window.setInterval(() => {
        // If we connected via Bridge in the meantime, stop polling
        if (this.controller) {
            this.stopConnectionAttempts();
            return;
        }

        if (checkDirect()) return;

        // Timeout check (5 seconds)
        if (Date.now() - startTime > 5000) {
             this.stopConnectionAttempts();
             if (!this.controller) {
                 this.showStatus("Connection Failed. Ensure window.helios is set or connectToParent() is called.", true);
             }
        }
    }, 100);
  }

  private stopConnectionAttempts() {
      if (this.connectionInterval) {
          window.clearInterval(this.connectionInterval);
          this.connectionInterval = null;
      }
  }

  private handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== this.iframe.contentWindow) return;

      // Check if this message is a handshake response
      if (event.data?.type === 'HELIOS_READY') {
          // If we receive a ready signal, we stop polling for direct access
          this.stopConnectionAttempts();
          this.hideStatus();

          // If we already have a controller (e.g. Direct Mode), we might stick with it
          if (!this.controller) {
              console.log("HeliosPlayer: Connected via Bridge Mode.");
              const iframeWin = this.iframe.contentWindow;
              if (iframeWin) {
                  this.setController(new BridgeController(iframeWin, event.data.state));
                  // Ensure we get the latest state immediately if provided
                  if (event.data.state) {
                      this.updateUI(event.data.state);
                  }
                  // Enable export for bridge mode
                  this.exportBtn.disabled = false;
              }
          }
      }
  };

  private handleSlotChange = () => {
    const slot = this.shadowRoot!.querySelector("slot");
    if (!slot) return;

    const elements = slot.assignedElements();
    const currentTrackElements = new Set<HTMLTrackElement>();

    elements.forEach((el) => {
        if (el.tagName === "TRACK") {
            const t = el as HTMLTrackElement;
            currentTrackElements.add(t);

            // Prevent duplicate track creation
            if (this._domTracks.has(t)) return;

            const kind = t.getAttribute("kind") || "captions";
            const label = t.getAttribute("label") || "";
            const lang = t.getAttribute("srclang") || "";
            const src = t.getAttribute("src");
            const isDefault = t.hasAttribute("default");

            const textTrack = this.addTextTrack(kind, label, lang);
            this._domTracks.set(t, textTrack);

            if (isDefault) {
                this.showCaptions = true;
                this.ccBtn.classList.add("active");
            }

            if (src) {
                fetch(src)
                .then((res) => {
                    if (!res.ok) throw new Error(`Status ${res.status}`);
                    return res.text();
                })
                .then((content) => {
                    const cues = parseCaptions(content);
                    cues.forEach(c => {
                        textTrack.addCue(new CueClass(c.startTime, c.endTime, c.text));
                    });

                    if (isDefault) {
                        textTrack.mode = 'showing';
                    } else {
                        textTrack.mode = 'disabled';
                    }
                })
                .catch((err) => console.error("HeliosPlayer: Failed to load captions", err));
            }
        }
    });

    // Remove tracks that are no longer in the DOM
    for (const [el, track] of this._domTracks.entries()) {
        if (!currentTrackElements.has(el)) {
            if (track.mode === 'showing') {
                track.mode = 'hidden';
            }
            this._textTracks.removeTrack(track);
            this._domTracks.delete(el);
        }
    }

    this.updateCCButtonVisibility();
  };

  private setController(controller: HeliosController) {
      // Clean up old controller
      if (this.controller) {
          this.controller.dispose();
      }
      if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
      }

      this.controller = controller;

      // Check for pending captions
      this.handleSlotChange();

      // Update States
      this._networkState = HeliosPlayer.NETWORK_IDLE;
      this._readyState = HeliosPlayer.HAVE_ENOUGH_DATA;

      // Dispatch Lifecycle Events
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('loadeddata'));
      this.dispatchEvent(new Event('canplay'));
      this.dispatchEvent(new Event('canplaythrough'));

      this.setControlsDisabled(false);

      if (this.pendingProps) {
        this.controller.setInputProps(this.pendingProps);
      }

      // Apply persisted media properties
      this.controller.setAudioVolume(this._pendingVolume);
      this.controller.setPlaybackRate(this._pendingPlaybackRate);

      // Determine muted state: Explicit property set > Attribute
      const shouldMute = this._pendingMuted !== null ? this._pendingMuted : this.hasAttribute("muted");
      this.controller.setAudioMuted(shouldMute);

      if (this.hasAttribute("loop")) {
        this.controller.setLoop(true);
      }

      const state = this.controller.getState();
      if (state) {
          this.scrubber.max = String(state.duration * state.fps);
          this.updateUI(state);
      }

      const unsubState = this.controller.subscribe((s) => this.updateUI(s));

      const unsubError = this.controller.onError((err) => {
        const message = err.message || String(err);
        this._error = {
          code: 4, // MEDIA_ERR_SRC_NOT_SUPPORTED as generic default
          message: message,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4
        };
        this.showStatus("Error: " + message, true, {
            label: "Reload",
            handler: () => this.retryConnection()
        });
        this.dispatchEvent(new CustomEvent('error', { detail: err }));
      });

      this.unsubscribe = () => {
        unsubState();
        unsubError();
      };

      if (this.hasAttribute("autoplay")) {
        this.controller.play();
      }
  }

  private updateAspectRatio() {
    const w = parseFloat(this.getAttribute("width") || "");
    const h = parseFloat(this.getAttribute("height") || "");

    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      this.style.aspectRatio = `${w} / ${h}`;
    } else {
      this.style.removeProperty("aspect-ratio");
    }
  }

  private togglePlayPause = () => {
    if (!this.controller) return;
    const state = this.controller.getState();

    const isFinished = state.currentFrame >= state.duration * state.fps - 1;

    if (isFinished) {
      // Restart the animation
      this.controller.seek(0);
      this.controller.play();
    } else if (state.isPlaying) {
      this.controller.pause();
    } else {
      this.controller.play();
    }
  };

  private toggleMute = () => {
    if (!this.controller) return;
    const state = this.controller.getState();
    this.controller.setAudioMuted(!state.muted);
  };

  private handleVolumeInput = () => {
    if (!this.controller) return;
    const vol = parseFloat(this.volumeSlider.value);
    this.controller.setAudioVolume(vol);
    if (vol > 0) {
       this.controller.setAudioMuted(false);
    }
  };

  private handleScrubberInput = () => {
    const frame = parseInt(this.scrubber.value, 10);
    if (this.controller) {
      this.controller.seek(frame);
    }
  };

  private handleScrubStart = () => {
    if (!this.controller) return;
    this.isScrubbing = true;
    this.dispatchEvent(new Event("seeking"));
    const state = this.controller.getState();
    this.wasPlayingBeforeScrub = state.isPlaying;

    if (this.wasPlayingBeforeScrub) {
      this.controller.pause();
    }
  };

  private handleScrubEnd = () => {
    if (!this.controller) return;
    this.isScrubbing = false;
    this.dispatchEvent(new Event("seeked"));

    if (this.wasPlayingBeforeScrub) {
      this.controller.play();
    }
  };

  private handleScrubberHover = (e: MouseEvent) => {
    if (!this.controller) return;
    const state = this.controller.getState();
    const rect = this.scrubberWrapper.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, offsetX / width));
    const time = pct * state.duration;

    this.scrubberTooltip.textContent = time.toFixed(2) + "s";
    this.scrubberTooltip.style.left = `${offsetX}px`;
    this.scrubberTooltip.classList.remove("hidden");
  };

  private handleScrubberLeave = () => {
    this.scrubberTooltip.classList.add("hidden");
  };

  private handleSpeedChange = () => {
    if (this.controller) {
      this.controller.setPlaybackRate(parseFloat(this.speedSelector.value));
    }
  };

  private toggleCaptions = () => {
    this.showCaptions = !this.showCaptions;
    this.ccBtn.classList.toggle("active", this.showCaptions);
    if (this.controller) {
      this.updateUI(this.controller.getState());
    }
  };

  private toggleDiagnostics = async () => {
    if (this.debugOverlay.classList.contains('hidden')) {
        this.debugOverlay.classList.remove('hidden');
        this.debugContent.textContent = "Running diagnostics...";
        try {
            const report = await this.diagnose();
            this.debugContent.textContent = JSON.stringify(report, null, 2);
        } catch (e: any) {
            this.debugContent.textContent = "Error: " + (e.message || String(e));
        }
    } else {
        this.debugOverlay.classList.add('hidden');
    }
  }

  private handleCopyDebug = () => {
    const text = this.debugContent.textContent || "";
    navigator.clipboard.writeText(text).then(() => {
        const originalText = this.copyDebugBtn.textContent;
        this.copyDebugBtn.textContent = "Copied!";
        setTimeout(() => {
            this.copyDebugBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy diagnostics:', err);
    });
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (this.isExporting) return;

    // Allow bubbling from children (like buttons), but ignore inputs
    const target = e.composedPath()[0] as HTMLElement;
    if (target && target.tagName) {
      const tagName = target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "select" || tagName === "textarea") {
        return;
      }
      // If focusing a button, Space triggers click natively. Avoid double toggle.
      if (e.key === " " && tagName === "button") {
        return;
      }
    }

    if (!this.controller) return;

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault(); // Prevent scrolling
        this.togglePlayPause();
        break;
      case "f":
      case "F":
        this.toggleFullscreen();
        break;
      case "d":
      case "D":
        if (e.shiftKey) {
            this.toggleDiagnostics();
        }
        break;
      case "ArrowRight":
      case "l":
      case "L":
        this.seekRelative(e.shiftKey ? 10 : 1);
        break;
      case "ArrowLeft":
      case "j":
      case "J":
        this.seekRelative(e.shiftKey ? -10 : -1);
        break;
      case "m":
      case "M":
        this.toggleMute();
        break;
      case ".":
        this.seekRelative(1);
        break;
      case ",":
        this.seekRelative(-1);
        break;
      case "i":
      case "I": {
        const s = this.controller.getState();
        const start = Math.floor(s.currentFrame);
        const totalFrames = s.duration * s.fps;
        let end = s.playbackRange ? s.playbackRange[1] : totalFrames;

        if (start >= end) {
          end = totalFrames;
        }
        this.controller.setPlaybackRange(start, end);
        break;
      }
      case "o":
      case "O": {
        const s = this.controller.getState();
        const end = Math.floor(s.currentFrame);
        let start = s.playbackRange ? s.playbackRange[0] : 0;

        if (end <= start) {
          start = 0;
        }
        this.controller.setPlaybackRange(start, end);
        break;
      }
      case "x":
      case "X":
        this.controller.clearPlaybackRange();
        break;
    }
  };

  private seekRelative(frames: number) {
    if (!this.controller) return;
    const state = this.controller.getState();
    const newFrame = Math.max(0, Math.min(Math.floor(state.duration * state.fps), state.currentFrame + frames));
    this.controller.seek(newFrame);
  }

  private toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      this.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  private updateFullscreenUI = () => {
    if (document.fullscreenElement === this) {
       this.fullscreenBtn.textContent = "↙";
       this.fullscreenBtn.title = "Exit Fullscreen";
    } else {
       this.fullscreenBtn.textContent = "⛶";
       this.fullscreenBtn.title = "Fullscreen";
    }
  };

  private updateUI(state: any) {
      // Update text tracks active cues
      if (state.fps) {
          const currentTime = state.currentFrame / state.fps;
          for (const track of this._textTracks) {
              track.updateActiveCues(currentTime);
          }
      }

      // Hide poster if we are playing or have advanced
      if (state.isPlaying || state.currentFrame > 0) {
         this.posterContainer.classList.add("hidden");
      }

      // Event Dispatching
      if (this.lastState) {
        if (state.isPlaying !== this.lastState.isPlaying) {
          this.dispatchEvent(new Event(state.isPlaying ? "play" : "pause"));
        }

        const wasFinished = this.lastState.currentFrame >= this.lastState.duration * this.lastState.fps - 1;
        const isFinishedNow = state.currentFrame >= state.duration * state.fps - 1;
        if (!wasFinished && isFinishedNow && !state.isPlaying) {
             this.dispatchEvent(new Event("ended"));
        }

        if (state.currentFrame !== this.lastState.currentFrame) {
             this.dispatchEvent(new Event("timeupdate"));
        }

        if (state.volume !== this.lastState.volume || state.muted !== this.lastState.muted) {
            this.dispatchEvent(new Event("volumechange"));
        }

        if (state.playbackRate !== this.lastState.playbackRate) {
            this.dispatchEvent(new Event("ratechange"));
        }

        if (state.duration !== this.lastState.duration) {
            this.dispatchEvent(new Event("durationchange"));
        }
      }

      const isFinished = state.currentFrame >= state.duration * state.fps - 1;

      if (isFinished) {
        this.playPauseBtn.textContent = "🔄"; // Restart button
        this.playPauseBtn.setAttribute("aria-label", "Restart");
      } else {
        this.playPauseBtn.textContent = state.isPlaying ? "❚❚" : "▶";
        this.playPauseBtn.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
      }

      const isMuted = state.muted || state.volume === 0;
      this.volumeBtn.textContent = isMuted ? "🔇" : "🔊";
      this.volumeBtn.setAttribute("aria-label", isMuted ? "Unmute" : "Mute");
      this.volumeSlider.value = String(state.volume !== undefined ? state.volume : 1);

      if (!this.isScrubbing) {
        this.scrubber.value = String(state.currentFrame);
      }
      const currentTime = (state.currentFrame / state.fps).toFixed(2);
      const totalTime = state.duration.toFixed(2);

      this.timeDisplay.textContent = `${currentTime} / ${totalTime}`;

      this.scrubber.setAttribute("aria-valuenow", String(state.currentFrame));
      this.scrubber.setAttribute("aria-valuemin", "0");
      this.scrubber.setAttribute("aria-valuemax", String(state.duration * state.fps));
      this.scrubber.setAttribute("aria-valuetext", `${currentTime} of ${totalTime} seconds`);

      if (state.playbackRate !== undefined) {
          this.speedSelector.value = String(state.playbackRate);
      }

      // Update Markers
      const markersChanged = !this.lastState || state.markers !== this.lastState.markers;
      if (markersChanged) {
        this.markersContainer.innerHTML = "";
        if (state.markers && state.duration > 0) {
          state.markers.forEach((marker: any) => {
            const pct = (marker.time / state.duration) * 100;
            if (pct >= 0 && pct <= 100) {
              const el = document.createElement("div");
              el.className = "marker";
              el.style.left = `${pct}%`;
              if (marker.color) el.style.backgroundColor = marker.color;
              el.title = marker.label || "";

              el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.controller) {
                  this.controller.seek(Math.floor(marker.time * state.fps));
                }
              });

              this.markersContainer.appendChild(el);
            }
          });
        }
      }

      if (state.playbackRange) {
        const totalFrames = state.duration * state.fps;
        if (totalFrames > 0) {
          const [start, end] = state.playbackRange;
          const startPct = (start / totalFrames) * 100;
          const endPct = (end / totalFrames) * 100;

          this.scrubber.style.background = `linear-gradient(to right,
            var(--helios-range-unselected-color) 0%,
            var(--helios-range-unselected-color) ${startPct}%,
            var(--helios-range-selected-color) ${startPct}%,
            var(--helios-range-selected-color) ${endPct}%,
            var(--helios-range-unselected-color) ${endPct}%,
            var(--helios-range-unselected-color) 100%
          )`;
        } else {
          this.scrubber.style.background = '';
        }
      } else {
        this.scrubber.style.background = '';
      }

      const active = state.activeCaptions || [];
      const newHash = this.showCaptions ? active.map((c: any) => c.text).join("|||") : "HIDDEN";

      if (newHash !== this.lastCaptionsHash) {
        this.captionsContainer.innerHTML = '';
        if (this.showCaptions && active.length > 0) {
          active.forEach((cue: any) => {
            const div = document.createElement('div');
            div.className = 'caption-cue';
            div.textContent = cue.text;
            this.captionsContainer.appendChild(div);
          });
        }
        this.lastCaptionsHash = newHash;
      }

      this.lastState = state;
  }

  // --- Loading / Error UI Helpers ---

  private showStatus(msg: string, isError: boolean, action?: { label: string, handler: () => void }) {
    this.overlay.classList.remove("hidden");
    this.statusText.textContent = msg;
    this.retryBtn.style.display = isError ? "block" : "none";

    if (action) {
      this.retryBtn.textContent = action.label;
      this.retryAction = action.handler;
    } else {
      this.retryBtn.textContent = "Retry";
      this.retryAction = () => this.retryConnection();
    }

    // Optional: Add visual distinction for errors beyond just the button
    this.statusText.classList.toggle('error-msg', isError);
  }

  private hideStatus() {
    this.overlay.classList.add("hidden");
  }

  public getController(): HeliosController | null {
    return this.controller;
  }

  public async getSchema(): Promise<HeliosSchema | undefined> {
    if (this.controller) {
      return this.controller.getSchema();
    }
    return undefined;
  }

  public async diagnose(): Promise<DiagnosticReport> {
    if (!this.controller) {
        throw new Error("Cannot run diagnostics: Player is not connected.");
    }
    return this.controller.diagnose();
  }

  private retryConnection() {
    this.showStatus("Retrying...", false);
    // Reload iframe to force fresh start
    this.load();
  }

  private renderClientSide = async () => {
    // If we are already exporting, this is a cancel request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.exportBtn.textContent = "Export";
      this.exportBtn.disabled = false;
      return;
    }

    // Export requires Controller (Direct or Bridge)
    if (!this.controller) {
        console.error("Export not available: Not connected.");
        return;
    }

    this.abortController = new AbortController();
    this.exportBtn.textContent = "Cancel";

    this.isExporting = true;
    this.lockPlaybackControls(true);

    const exporter = new ClientSideExporter(this.controller, this.iframe);

    const exportMode = (this.getAttribute("export-mode") || "auto") as "auto" | "canvas" | "dom";
    const canvasSelector = this.getAttribute("canvas-selector") || "canvas";
    const exportFormat = (this.getAttribute("export-format") || "mp4") as "mp4" | "webm";
    const captionMode = (this.getAttribute("export-caption-mode") || "burn-in") as "burn-in" | "file";

    const exportWidth = parseFloat(this.getAttribute("export-width") || "");
    const exportHeight = parseFloat(this.getAttribute("export-height") || "");
    const exportBitrate = parseInt(this.getAttribute("export-bitrate") || "");
    const filename = this.getAttribute("export-filename") || "video";

    const width = !isNaN(exportWidth) && exportWidth > 0 ? exportWidth : undefined;
    const height = !isNaN(exportHeight) && exportHeight > 0 ? exportHeight : undefined;
    const bitrate = !isNaN(exportBitrate) && exportBitrate > 0 ? exportBitrate : undefined;

    let includeCaptions = this.showCaptions;

    if (this.showCaptions && captionMode === 'file') {
      const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
      if (showingTrack) {
        // Convert TextTrackCueList to Array before mapping
        const cues = Array.from(showingTrack.cues).map((cue: any) => ({
          startTime: cue.startTime,
          endTime: cue.endTime,
          text: cue.text
        }));
        exporter.saveCaptionsAsSRT(cues, `${filename}.srt`);
      }
      includeCaptions = false;
    }

    try {
        await exporter.export({
            onProgress: (p) => {
                this.exportBtn.textContent = `Cancel (${Math.round(p * 100)}%)`;
            },
            signal: this.abortController.signal,
            mode: exportMode,
            canvasSelector: canvasSelector,
            format: exportFormat,
            includeCaptions: includeCaptions,
            width: width,
            height: height,
            bitrate: bitrate,
            filename: filename
        });
    } catch (e: any) {
        if (e.message !== "Export aborted") {
          this.showStatus("Export Failed: " + e.message, true, {
            label: "Dismiss",
            handler: () => this.hideStatus()
          });
        }
        console.error("Export failed or aborted", e);
    } finally {
        this.isExporting = false;
        this.lockPlaybackControls(false);
        this.exportBtn.textContent = "Export";
        this.exportBtn.disabled = false;
        this.abortController = null;
    }
  };
}

if (!customElements.get("helios-player")) {
  customElements.define("helios-player", HeliosPlayer);
}
