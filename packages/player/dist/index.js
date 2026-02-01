import { DirectController, BridgeController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";
import { HeliosTextTrack, HeliosTextTrackList, CueClass } from "./features/text-tracks";
import { parseSRT } from "./features/srt-parser";
export { ClientSideExporter };
class StaticTimeRange {
    startVal;
    endVal;
    constructor(startVal, endVal) {
        this.startVal = startVal;
        this.endVal = endVal;
    }
    get length() {
        return this.endVal > 0 ? 1 : 0;
    }
    start(index) {
        if (index !== 0 || this.length === 0)
            throw new Error("IndexSizeError");
        return this.startVal;
    }
    end(index) {
        if (index !== 0 || this.length === 0)
            throw new Error("IndexSizeError");
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
  </style>
  <slot></slot>
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
export class HeliosPlayer extends HTMLElement {
    iframe;
    pipVideo;
    _textTracks;
    _domTracks = new Map();
    playPauseBtn;
    volumeBtn;
    volumeSlider;
    scrubber;
    scrubberWrapper;
    scrubberTooltip;
    markersContainer;
    timeDisplay;
    exportBtn;
    overlay;
    statusText;
    retryBtn;
    retryAction;
    speedSelector;
    fullscreenBtn;
    pipBtn;
    captionsContainer;
    ccBtn;
    showCaptions = false;
    lastCaptionsHash = "";
    clickLayer;
    posterContainer;
    posterImage;
    bigPlayBtn;
    pendingSrc = null;
    isLoaded = false;
    resizeObserver;
    controller = null;
    // Keep track if we have direct access (optional, mainly for debugging/logging)
    directHelios = null;
    unsubscribe = null;
    connectionInterval = null;
    abortController = null;
    isExporting = false;
    isScrubbing = false;
    wasPlayingBeforeScrub = false;
    lastState = null;
    pendingProps = null;
    _error = null;
    // Persistence for properties set before connection
    _pendingVolume = 1;
    _pendingPlaybackRate = 1;
    _pendingMuted = null;
    // --- Standard Media API States ---
    static HAVE_NOTHING = 0;
    static HAVE_METADATA = 1;
    static HAVE_CURRENT_DATA = 2;
    static HAVE_FUTURE_DATA = 3;
    static HAVE_ENOUGH_DATA = 4;
    static NETWORK_EMPTY = 0;
    static NETWORK_IDLE = 1;
    static NETWORK_LOADING = 2;
    static NETWORK_NO_SOURCE = 3;
    _readyState = HeliosPlayer.HAVE_NOTHING;
    _networkState = HeliosPlayer.NETWORK_EMPTY;
    get readyState() {
        return this._readyState;
    }
    get networkState() {
        return this._networkState;
    }
    get error() {
        return this._error;
    }
    get currentSrc() {
        return this.src;
    }
    // --- Standard Media API ---
    canPlayType(type) {
        // We strictly play Helios compositions, not standard video MIME types.
        // Return empty string to be spec-compliant for video/mp4 etc.
        return "";
    }
    get defaultMuted() {
        return this.hasAttribute("muted");
    }
    set defaultMuted(val) {
        if (val) {
            this.setAttribute("muted", "");
        }
        else {
            this.removeAttribute("muted");
        }
    }
    _defaultPlaybackRate = 1.0;
    get defaultPlaybackRate() {
        return this._defaultPlaybackRate;
    }
    set defaultPlaybackRate(val) {
        if (this._defaultPlaybackRate !== val) {
            this._defaultPlaybackRate = val;
            this.dispatchEvent(new Event("ratechange"));
        }
    }
    _preservesPitch = true;
    get preservesPitch() {
        return this._preservesPitch;
    }
    set preservesPitch(val) {
        this._preservesPitch = val;
    }
    get srcObject() {
        return null;
    }
    set srcObject(val) {
        console.warn("HeliosPlayer does not support srcObject");
    }
    get crossOrigin() {
        return this.getAttribute("crossorigin");
    }
    set crossOrigin(val) {
        if (val !== null) {
            this.setAttribute("crossorigin", val);
        }
        else {
            this.removeAttribute("crossorigin");
        }
    }
    get seeking() {
        // Return internal scrubbing state as seeking
        return this.isScrubbing;
    }
    get buffered() {
        return new StaticTimeRange(0, this.duration);
    }
    get seekable() {
        return new StaticTimeRange(0, this.duration);
    }
    get played() {
        // Standard Media API: played range matches duration
        return new StaticTimeRange(0, this.duration);
    }
    get videoWidth() {
        if (this.controller) {
            const state = this.controller.getState();
            if (state.width)
                return state.width;
        }
        return parseFloat(this.getAttribute("width") || "0");
    }
    get videoHeight() {
        if (this.controller) {
            const state = this.controller.getState();
            if (state.height)
                return state.height;
        }
        return parseFloat(this.getAttribute("height") || "0");
    }
    get currentTime() {
        if (!this.controller)
            return 0;
        const s = this.controller.getState();
        return s.fps ? s.currentFrame / s.fps : 0;
    }
    set currentTime(val) {
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
    get currentFrame() {
        return this.controller ? this.controller.getState().currentFrame : 0;
    }
    set currentFrame(val) {
        if (this.controller) {
            // Dispatch events to satisfy Standard Media API expectations
            this.dispatchEvent(new Event("seeking"));
            this.controller.seek(Math.floor(val));
            this.dispatchEvent(new Event("seeked"));
        }
    }
    get duration() {
        return this.controller ? this.controller.getState().duration : 0;
    }
    get paused() {
        return this.controller ? !this.controller.getState().isPlaying : true;
    }
    get ended() {
        if (!this.controller)
            return false;
        const s = this.controller.getState();
        return s.currentFrame >= s.duration * s.fps - 1;
    }
    get volume() {
        if (this.controller) {
            return this.controller.getState().volume ?? this._pendingVolume;
        }
        return this._pendingVolume;
    }
    set volume(val) {
        const clamped = Math.max(0, Math.min(1, val));
        this._pendingVolume = clamped;
        if (this.controller) {
            this.controller.setAudioVolume(clamped);
        }
    }
    get muted() {
        if (this.controller) {
            return !!this.controller.getState().muted;
        }
        // If pendingMuted is explicitly set, return it.
        // Otherwise fallback to attribute presence (default behavior).
        return this._pendingMuted !== null ? this._pendingMuted : this.hasAttribute("muted");
    }
    set muted(val) {
        this._pendingMuted = val;
        if (this.controller) {
            this.controller.setAudioMuted(val);
        }
    }
    get interactive() {
        return this.hasAttribute("interactive");
    }
    set interactive(val) {
        if (val) {
            this.setAttribute("interactive", "");
        }
        else {
            this.removeAttribute("interactive");
        }
    }
    get playbackRate() {
        if (this.controller) {
            return this.controller.getState().playbackRate ?? this._pendingPlaybackRate;
        }
        return this._pendingPlaybackRate;
    }
    set playbackRate(val) {
        this._pendingPlaybackRate = val;
        if (this.controller) {
            this.controller.setPlaybackRate(val);
        }
    }
    get fps() {
        return this.controller ? this.controller.getState().fps : 0;
    }
    get src() {
        return this.getAttribute("src") || "";
    }
    set src(val) {
        this.setAttribute("src", val);
    }
    get autoplay() {
        return this.hasAttribute("autoplay");
    }
    set autoplay(val) {
        if (val) {
            this.setAttribute("autoplay", "");
        }
        else {
            this.removeAttribute("autoplay");
        }
    }
    get loop() {
        return this.hasAttribute("loop");
    }
    set loop(val) {
        if (val) {
            this.setAttribute("loop", "");
        }
        else {
            this.removeAttribute("loop");
        }
    }
    get controls() {
        return this.hasAttribute("controls");
    }
    set controls(val) {
        if (val) {
            this.setAttribute("controls", "");
        }
        else {
            this.removeAttribute("controls");
        }
    }
    get poster() {
        return this.getAttribute("poster") || "";
    }
    set poster(val) {
        this.setAttribute("poster", val);
    }
    get preload() {
        return this.getAttribute("preload") || "auto";
    }
    set preload(val) {
        this.setAttribute("preload", val);
    }
    get sandbox() {
        return this.getAttribute("sandbox") || "allow-scripts allow-same-origin";
    }
    set sandbox(val) {
        this.setAttribute("sandbox", val);
    }
    async requestPictureInPicture() {
        if (!document.pictureInPictureEnabled) {
            throw new Error("Picture-in-Picture not supported");
        }
        // Try to find the canvas
        let canvas = null;
        try {
            const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
            if (doc) {
                const selector = this.getAttribute("canvas-selector") || "canvas";
                canvas = doc.querySelector(selector);
            }
        }
        catch (e) {
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
    togglePip() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        }
        else {
            this.requestPictureInPicture().catch(e => {
                console.warn("HeliosPlayer: PiP failed", e);
            });
        }
    }
    onEnterPip = () => {
        this.pipBtn.style.color = "var(--helios-accent-color)";
        this.dispatchEvent(new Event("enterpictureinpicture"));
    };
    onLeavePip = () => {
        this.pipBtn.style.removeProperty("color");
        this.pipVideo.pause();
        this.dispatchEvent(new Event("leavepictureinpicture"));
    };
    async play() {
        if (!this.isLoaded) {
            this.setAttribute("autoplay", "");
            this.load();
        }
        else if (this.controller) {
            this.controller.play();
        }
    }
    load() {
        if (this.pendingSrc) {
            const src = this.pendingSrc;
            this.pendingSrc = null;
            this.loadIframe(src);
        }
        else {
            const src = this.getAttribute("src");
            if (src) {
                this.loadIframe(src);
            }
        }
    }
    pause() {
        if (this.controller) {
            this.controller.pause();
        }
    }
    static get observedAttributes() {
        return ["src", "width", "height", "autoplay", "loop", "controls", "export-format", "input-props", "poster", "muted", "interactive", "preload", "controlslist", "sandbox", "export-caption-mode"];
    }
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.iframe = this.shadowRoot.querySelector("iframe");
        this.playPauseBtn = this.shadowRoot.querySelector(".play-pause-btn");
        this.volumeBtn = this.shadowRoot.querySelector(".volume-btn");
        this.volumeSlider = this.shadowRoot.querySelector(".volume-slider");
        this.scrubber = this.shadowRoot.querySelector(".scrubber");
        this.scrubberWrapper = this.shadowRoot.querySelector(".scrubber-wrapper");
        this.scrubberTooltip = this.shadowRoot.querySelector(".scrubber-tooltip");
        this.markersContainer = this.shadowRoot.querySelector(".markers-container");
        this.timeDisplay = this.shadowRoot.querySelector(".time-display");
        this.exportBtn = this.shadowRoot.querySelector(".export-btn");
        this.overlay = this.shadowRoot.querySelector(".status-overlay");
        this.statusText = this.shadowRoot.querySelector(".status-text");
        this.retryBtn = this.shadowRoot.querySelector(".retry-btn");
        this.speedSelector = this.shadowRoot.querySelector(".speed-selector");
        this.fullscreenBtn = this.shadowRoot.querySelector(".fullscreen-btn");
        this.pipBtn = this.shadowRoot.querySelector(".pip-btn");
        this.captionsContainer = this.shadowRoot.querySelector(".captions-container");
        this.ccBtn = this.shadowRoot.querySelector(".cc-btn");
        this.pipVideo = this.shadowRoot.querySelector(".pip-video");
        this.clickLayer = this.shadowRoot.querySelector(".click-layer");
        this.posterContainer = this.shadowRoot.querySelector(".poster-container");
        this.posterImage = this.shadowRoot.querySelector(".poster-image");
        this.bigPlayBtn = this.shadowRoot.querySelector(".big-play-btn");
        this.retryAction = () => this.retryConnection();
        this.retryBtn.onclick = () => this.retryAction();
        this.clickLayer.addEventListener("click", () => {
            this.focus();
            this.togglePlayPause();
        });
        this.clickLayer.addEventListener("dblclick", () => this.toggleFullscreen());
        this._textTracks = new HeliosTextTrackList();
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const controls = this.shadowRoot.querySelector(".controls");
                if (controls) {
                    controls.classList.toggle("layout-compact", width < 500);
                    controls.classList.toggle("layout-tiny", width < 350);
                }
            }
        });
    }
    get textTracks() {
        return this._textTracks;
    }
    addTextTrack(kind, label = "", language = "") {
        const track = new HeliosTextTrack(kind, label, language, this);
        this._textTracks.addTrack(track);
        return track;
    }
    handleTrackModeChange(track) {
        if (!this.controller)
            return;
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
            const captions = track.cues.map((cue, index) => ({
                id: cue.id || String(index + 1),
                startTime: cue.startTime * 1000, // Convert seconds to milliseconds
                endTime: cue.endTime * 1000, // Convert seconds to milliseconds
                text: cue.text
            }));
            this.controller.setCaptions(captions);
        }
        else {
            // If hiding/disabling, check if any other track is showing
            const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
            if (showingTrack) {
                const captions = showingTrack.cues.map((cue, index) => ({
                    id: cue.id || String(index + 1),
                    startTime: cue.startTime * 1000, // Convert seconds to milliseconds
                    endTime: cue.endTime * 1000, // Convert seconds to milliseconds
                    text: cue.text
                }));
                this.controller.setCaptions(captions);
            }
            else {
                this.controller.setCaptions([]);
            }
        }
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal)
            return;
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
            }
            else {
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
            }
            catch (e) {
                console.warn("HeliosPlayer: Invalid JSON in input-props", e);
            }
        }
        if (name === "muted") {
            if (this.controller) {
                this.controller.setAudioMuted(this.hasAttribute("muted"));
            }
        }
        if (name === "controlslist") {
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
                    this.loadIframe(this.getAttribute("src"));
                }
            }
        }
    }
    updateControlsVisibility() {
        if (!this.exportBtn || !this.fullscreenBtn)
            return;
        const attr = this.getAttribute("controlslist") || "";
        const tokens = attr.toLowerCase().split(/\s+/);
        if (tokens.includes("nodownload")) {
            this.exportBtn.style.display = "none";
        }
        else {
            this.exportBtn.style.removeProperty("display");
        }
        if (tokens.includes("nofullscreen")) {
            this.fullscreenBtn.style.display = "none";
        }
        else {
            this.fullscreenBtn.style.removeProperty("display");
        }
    }
    get inputProps() {
        return this.pendingProps;
    }
    set inputProps(val) {
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
        const slot = this.shadowRoot.querySelector("slot");
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
        const slot = this.shadowRoot.querySelector("slot");
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
    loadIframe(src) {
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
    handleBigPlayClick = () => {
        this.load();
        // If we are already loaded, just play
        if (this.controller) {
            this.controller.play();
        }
        else {
            // Set autoplay so the controller will play once connected
            this.setAttribute("autoplay", "");
        }
    };
    updatePosterVisibility() {
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
            }
            else {
                this.posterContainer.classList.remove("hidden");
            }
        }
        else {
            this.posterContainer.classList.add("hidden");
        }
    }
    setControlsDisabled(disabled) {
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
    lockPlaybackControls(locked) {
        this.playPauseBtn.disabled = locked;
        this.volumeBtn.disabled = locked;
        this.volumeSlider.disabled = locked;
        this.scrubber.disabled = locked;
        this.speedSelector.disabled = locked;
        this.fullscreenBtn.disabled = locked;
        this.pipBtn.disabled = locked;
        this.ccBtn.disabled = locked;
    }
    handleIframeLoad = () => {
        if (!this.iframe.contentWindow)
            return;
        this.startConnectionAttempts();
    };
    startConnectionAttempts() {
        this.stopConnectionAttempts();
        // 1. Bridge Mode (Fire and forget, wait for message)
        // We send this immediately so if the iframe is listening it can respond.
        this.iframe.contentWindow?.postMessage({ type: 'HELIOS_CONNECT' }, '*');
        // 2. Direct Mode (Polling)
        const checkDirect = () => {
            let directInstance;
            try {
                directInstance = this.iframe.contentWindow.helios;
            }
            catch (e) {
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
        if (checkDirect())
            return;
        // We poll because window.helios might be set asynchronously.
        const startTime = Date.now();
        this.connectionInterval = window.setInterval(() => {
            // If we connected via Bridge in the meantime, stop polling
            if (this.controller) {
                this.stopConnectionAttempts();
                return;
            }
            if (checkDirect())
                return;
            // Timeout check (5 seconds)
            if (Date.now() - startTime > 5000) {
                this.stopConnectionAttempts();
                if (!this.controller) {
                    this.showStatus("Connection Failed. Ensure window.helios is set or connectToParent() is called.", true);
                }
            }
        }, 100);
    }
    stopConnectionAttempts() {
        if (this.connectionInterval) {
            window.clearInterval(this.connectionInterval);
            this.connectionInterval = null;
        }
    }
    handleWindowMessage = (event) => {
        if (event.source !== this.iframe.contentWindow)
            return;
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
    handleSlotChange = () => {
        const slot = this.shadowRoot.querySelector("slot");
        if (!slot)
            return;
        const elements = slot.assignedElements();
        const currentTrackElements = new Set();
        elements.forEach((el) => {
            if (el.tagName === "TRACK") {
                const t = el;
                currentTrackElements.add(t);
                // Prevent duplicate track creation
                if (this._domTracks.has(t))
                    return;
                const kind = t.getAttribute("kind") || "captions";
                const label = t.getAttribute("label") || "";
                const lang = t.getAttribute("srclang") || "";
                const src = t.getAttribute("src");
                const isDefault = t.hasAttribute("default");
                const textTrack = this.addTextTrack(kind, label, lang);
                this._domTracks.set(t, textTrack);
                if (src) {
                    fetch(src)
                        .then((res) => {
                        if (!res.ok)
                            throw new Error(`Status ${res.status}`);
                        return res.text();
                    })
                        .then((srt) => {
                        const cues = parseSRT(srt);
                        cues.forEach(c => {
                            textTrack.addCue(new CueClass(c.startTime, c.endTime, c.text));
                        });
                        if (isDefault) {
                            textTrack.mode = 'showing';
                        }
                        else {
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
    };
    setController(controller) {
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
    updateAspectRatio() {
        const w = parseFloat(this.getAttribute("width") || "");
        const h = parseFloat(this.getAttribute("height") || "");
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            this.style.aspectRatio = `${w} / ${h}`;
        }
        else {
            this.style.removeProperty("aspect-ratio");
        }
    }
    togglePlayPause = () => {
        if (!this.controller)
            return;
        const state = this.controller.getState();
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished) {
            // Restart the animation
            this.controller.seek(0);
            this.controller.play();
        }
        else if (state.isPlaying) {
            this.controller.pause();
        }
        else {
            this.controller.play();
        }
    };
    toggleMute = () => {
        if (!this.controller)
            return;
        const state = this.controller.getState();
        this.controller.setAudioMuted(!state.muted);
    };
    handleVolumeInput = () => {
        if (!this.controller)
            return;
        const vol = parseFloat(this.volumeSlider.value);
        this.controller.setAudioVolume(vol);
        if (vol > 0) {
            this.controller.setAudioMuted(false);
        }
    };
    handleScrubberInput = () => {
        const frame = parseInt(this.scrubber.value, 10);
        if (this.controller) {
            this.controller.seek(frame);
        }
    };
    handleScrubStart = () => {
        if (!this.controller)
            return;
        this.isScrubbing = true;
        this.dispatchEvent(new Event("seeking"));
        const state = this.controller.getState();
        this.wasPlayingBeforeScrub = state.isPlaying;
        if (this.wasPlayingBeforeScrub) {
            this.controller.pause();
        }
    };
    handleScrubEnd = () => {
        if (!this.controller)
            return;
        this.isScrubbing = false;
        this.dispatchEvent(new Event("seeked"));
        if (this.wasPlayingBeforeScrub) {
            this.controller.play();
        }
    };
    handleScrubberHover = (e) => {
        if (!this.controller)
            return;
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
    handleScrubberLeave = () => {
        this.scrubberTooltip.classList.add("hidden");
    };
    handleSpeedChange = () => {
        if (this.controller) {
            this.controller.setPlaybackRate(parseFloat(this.speedSelector.value));
        }
    };
    toggleCaptions = () => {
        this.showCaptions = !this.showCaptions;
        this.ccBtn.classList.toggle("active", this.showCaptions);
        if (this.controller) {
            this.updateUI(this.controller.getState());
        }
    };
    handleKeydown = (e) => {
        if (this.isExporting)
            return;
        // Allow bubbling from children (like buttons), but ignore inputs
        const target = e.composedPath()[0];
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
        if (!this.controller)
            return;
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
    seekRelative(frames) {
        if (!this.controller)
            return;
        const state = this.controller.getState();
        const newFrame = Math.max(0, Math.min(Math.floor(state.duration * state.fps), state.currentFrame + frames));
        this.controller.seek(newFrame);
    }
    toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            this.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
        else {
            document.exitFullscreen();
        }
    };
    updateFullscreenUI = () => {
        if (document.fullscreenElement === this) {
            this.fullscreenBtn.textContent = "↙";
            this.fullscreenBtn.title = "Exit Fullscreen";
        }
        else {
            this.fullscreenBtn.textContent = "⛶";
            this.fullscreenBtn.title = "Fullscreen";
        }
    };
    updateUI(state) {
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
        }
        else {
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
                state.markers.forEach((marker) => {
                    const pct = (marker.time / state.duration) * 100;
                    if (pct >= 0 && pct <= 100) {
                        const el = document.createElement("div");
                        el.className = "marker";
                        el.style.left = `${pct}%`;
                        if (marker.color)
                            el.style.backgroundColor = marker.color;
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
            }
            else {
                this.scrubber.style.background = '';
            }
        }
        else {
            this.scrubber.style.background = '';
        }
        const active = state.activeCaptions || [];
        const newHash = this.showCaptions ? active.map((c) => c.text).join("|||") : "HIDDEN";
        if (newHash !== this.lastCaptionsHash) {
            this.captionsContainer.innerHTML = '';
            if (this.showCaptions && active.length > 0) {
                active.forEach((cue) => {
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
    showStatus(msg, isError, action) {
        this.overlay.classList.remove("hidden");
        this.statusText.textContent = msg;
        this.retryBtn.style.display = isError ? "block" : "none";
        if (action) {
            this.retryBtn.textContent = action.label;
            this.retryAction = action.handler;
        }
        else {
            this.retryBtn.textContent = "Retry";
            this.retryAction = () => this.retryConnection();
        }
        // Optional: Add visual distinction for errors beyond just the button
        this.statusText.classList.toggle('error-msg', isError);
    }
    hideStatus() {
        this.overlay.classList.add("hidden");
    }
    getController() {
        return this.controller;
    }
    async getSchema() {
        if (this.controller) {
            return this.controller.getSchema();
        }
        return undefined;
    }
    retryConnection() {
        this.showStatus("Retrying...", false);
        // Reload iframe to force fresh start
        this.load();
    }
    renderClientSide = async () => {
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
        const exportMode = (this.getAttribute("export-mode") || "auto");
        const canvasSelector = this.getAttribute("canvas-selector") || "canvas";
        const exportFormat = (this.getAttribute("export-format") || "mp4");
        const captionMode = (this.getAttribute("export-caption-mode") || "burn-in");
        let includeCaptions = this.showCaptions;
        if (this.showCaptions && captionMode === 'file') {
            const showingTrack = Array.from(this._textTracks).find(t => t.mode === 'showing' && t.kind === 'captions');
            if (showingTrack) {
                // Convert TextTrackCueList to Array before mapping
                const cues = Array.from(showingTrack.cues).map((cue) => ({
                    startTime: cue.startTime,
                    endTime: cue.endTime,
                    text: cue.text
                }));
                exporter.saveCaptionsAsSRT(cues, "captions.srt");
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
                includeCaptions: includeCaptions
            });
        }
        catch (e) {
            if (e.message !== "Export aborted") {
                this.showStatus("Export Failed: " + e.message, true, {
                    label: "Dismiss",
                    handler: () => this.hideStatus()
                });
            }
            console.error("Export failed or aborted", e);
        }
        finally {
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
