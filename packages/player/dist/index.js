import { DirectController, BridgeController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";
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
      font-family: sans-serif;
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
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      padding: 8px;
      color: white;
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
      color: white;
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
      color: white;
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
      background: #555;
      outline: none;
      border-radius: 2px;
    }
    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 12px;
      height: 12px;
      background: #fff;
      cursor: pointer;
      border-radius: 50%;
    }
    .export-btn {
      background-color: #007bff;
      border: none;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 6px 12px;
      margin: 0 10px;
      border-radius: 4px;
    }
    .export-btn:hover {
      background-color: #0056b3;
    }
    .export-btn:disabled {
      background-color: #666;
      cursor: not-allowed;
    }
    .scrubber {
      flex-grow: 1;
      margin: 0 16px;
      -webkit-appearance: none;
      width: 100%;
      height: 8px;
      background: #555;
      outline: none;
      opacity: 0.9;
      transition: opacity .2s;
    }
    .scrubber::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #007bff;
      cursor: pointer;
      border-radius: 50%;
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
      color: white;
      border: 1px solid #555;
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
      border-color: #007bff;
    }
    .fullscreen-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      width: 40px;
      height: 40px;
      margin-left: 8px;
    }
    .fullscreen-btn:hover {
      color: #007bff;
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
      color: white;
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
      color: #007bff;
      border-bottom: 2px solid #007bff;
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
  </style>
  <div class="status-overlay hidden" part="overlay">
    <div class="status-text">Connecting...</div>
    <button class="retry-btn" style="display: none">Retry</button>
  </div>
  <div class="poster-container hidden" part="poster">
    <img class="poster-image" alt="Video poster" />
    <div class="big-play-btn" aria-label="Play video">▶</div>
  </div>
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
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber" aria-label="Seek time">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
    <button class="fullscreen-btn" part="fullscreen-button" aria-label="Toggle fullscreen">⛶</button>
  </div>
`;
export class HeliosPlayer extends HTMLElement {
    iframe;
    playPauseBtn;
    volumeBtn;
    volumeSlider;
    scrubber;
    timeDisplay;
    exportBtn;
    overlay;
    statusText;
    retryBtn;
    retryAction;
    speedSelector;
    fullscreenBtn;
    captionsContainer;
    ccBtn;
    showCaptions = false;
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
    // --- Standard Media API ---
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
        return this.controller ? this.controller.getState().volume ?? 1 : 1;
    }
    set volume(val) {
        if (this.controller) {
            this.controller.setAudioVolume(Math.max(0, Math.min(1, val)));
        }
    }
    get muted() {
        return this.controller ? !!this.controller.getState().muted : false;
    }
    set muted(val) {
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
        return this.controller ? this.controller.getState().playbackRate ?? 1 : 1;
    }
    set playbackRate(val) {
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
    }
    pause() {
        if (this.controller) {
            this.controller.pause();
        }
    }
    static get observedAttributes() {
        return ["src", "width", "height", "autoplay", "loop", "controls", "export-format", "input-props", "poster", "muted", "interactive", "preload"];
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
        this.timeDisplay = this.shadowRoot.querySelector(".time-display");
        this.exportBtn = this.shadowRoot.querySelector(".export-btn");
        this.overlay = this.shadowRoot.querySelector(".status-overlay");
        this.statusText = this.shadowRoot.querySelector(".status-text");
        this.retryBtn = this.shadowRoot.querySelector(".retry-btn");
        this.speedSelector = this.shadowRoot.querySelector(".speed-selector");
        this.fullscreenBtn = this.shadowRoot.querySelector(".fullscreen-btn");
        this.captionsContainer = this.shadowRoot.querySelector(".captions-container");
        this.ccBtn = this.shadowRoot.querySelector(".cc-btn");
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
        this.exportBtn.addEventListener("click", this.renderClientSide);
        this.speedSelector.addEventListener("change", this.handleSpeedChange);
        this.fullscreenBtn.addEventListener("click", this.toggleFullscreen);
        this.ccBtn.addEventListener("click", this.toggleCaptions);
        this.bigPlayBtn.addEventListener("click", this.handleBigPlayClick);
        this.posterContainer.addEventListener("click", this.handleBigPlayClick);
        // Initial state: disabled until connected
        this.setControlsDisabled(true);
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
        this.exportBtn.removeEventListener("click", this.renderClientSide);
        this.speedSelector.removeEventListener("change", this.handleSpeedChange);
        this.fullscreenBtn.removeEventListener("click", this.toggleFullscreen);
        this.ccBtn.removeEventListener("click", this.toggleCaptions);
        this.bigPlayBtn.removeEventListener("click", this.handleBigPlayClick);
        this.posterContainer.removeEventListener("click", this.handleBigPlayClick);
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
        if (this.hasAttribute("muted")) {
            this.controller.setAudioMuted(true);
        }
        const state = this.controller.getState();
        if (state) {
            this.scrubber.max = String(state.duration * state.fps);
            this.updateUI(state);
        }
        const unsubState = this.controller.subscribe((s) => this.updateUI(s));
        const unsubError = this.controller.onError((err) => {
            this.showStatus("Error: " + (err.message || String(err)), true, {
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
            case ".":
                this.seekRelative(1);
                break;
            case ",":
                this.seekRelative(-1);
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
        this.lastState = state;
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished && this.hasAttribute("loop")) {
            // Prevent infinite loop if something goes wrong, only restart if we stopped
            if (!state.isPlaying) {
                this.controller.seek(0);
                this.controller.play();
                return;
            }
        }
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
        this.captionsContainer.innerHTML = '';
        if (this.showCaptions && state.activeCaptions && state.activeCaptions.length > 0) {
            state.activeCaptions.forEach((cue) => {
                const div = document.createElement('div');
                div.className = 'caption-cue';
                div.textContent = cue.text;
                this.captionsContainer.appendChild(div);
            });
        }
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
    retryConnection() {
        this.showStatus("Retrying...", false);
        // Reload iframe to force fresh start
        const src = this.iframe.src;
        this.iframe.src = src;
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
        try {
            await exporter.export({
                onProgress: (p) => {
                    this.exportBtn.textContent = `Cancel (${Math.round(p * 100)}%)`;
                },
                signal: this.abortController.signal,
                mode: exportMode,
                canvasSelector: canvasSelector,
                format: exportFormat,
                includeCaptions: this.showCaptions
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
customElements.define("helios-player", HeliosPlayer);
