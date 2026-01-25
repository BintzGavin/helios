import { DirectController, BridgeController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";
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
  </style>
  <div class="status-overlay" part="overlay">
    <div class="status-text">Connecting...</div>
    <button class="retry-btn" style="display: none">Retry</button>
  </div>
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin"></iframe>
  <div class="controls">
    <button class="play-pause-btn" part="play-pause-button">▶</button>
    <button class="export-btn" part="export-button">Export</button>
    <select class="speed-selector" part="speed-selector">
      <option value="0.25">0.25x</option>
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
    </select>
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
  </div>
`;
export class HeliosPlayer extends HTMLElement {
    iframe;
    playPauseBtn;
    scrubber;
    timeDisplay;
    exportBtn;
    overlay;
    statusText;
    retryBtn;
    speedSelector;
    controller = null;
    // Keep track if we have direct access (optional, mainly for debugging/logging)
    directHelios = null;
    unsubscribe = null;
    connectionTimeout = null;
    abortController = null;
    static get observedAttributes() {
        return ["src", "width", "height"];
    }
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.iframe = this.shadowRoot.querySelector("iframe");
        this.playPauseBtn = this.shadowRoot.querySelector(".play-pause-btn");
        this.scrubber = this.shadowRoot.querySelector(".scrubber");
        this.timeDisplay = this.shadowRoot.querySelector(".time-display");
        this.exportBtn = this.shadowRoot.querySelector(".export-btn");
        this.overlay = this.shadowRoot.querySelector(".status-overlay");
        this.statusText = this.shadowRoot.querySelector(".status-text");
        this.retryBtn = this.shadowRoot.querySelector(".retry-btn");
        this.speedSelector = this.shadowRoot.querySelector(".speed-selector");
        this.retryBtn.onclick = () => this.retryConnection();
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal)
            return;
        if (name === "src") {
            this.iframe.src = newVal;
            if (this.controller) {
                this.controller.pause();
                this.controller.dispose();
                this.controller = null;
            }
            this.setControlsDisabled(true);
            this.showStatus("Loading...", false);
        }
        if (name === "width" || name === "height") {
            this.updateAspectRatio();
        }
    }
    connectedCallback() {
        this.iframe.addEventListener("load", this.handleIframeLoad);
        window.addEventListener("message", this.handleWindowMessage);
        this.playPauseBtn.addEventListener("click", this.togglePlayPause);
        this.scrubber.addEventListener("input", this.handleScrubberInput);
        this.exportBtn.addEventListener("click", this.renderClientSide);
        this.speedSelector.addEventListener("change", this.handleSpeedChange);
        // Initial state: disabled until connected
        this.setControlsDisabled(true);
        // Only show connecting if we haven't already shown "Loading..." via attributeChangedCallback
        if (this.overlay.classList.contains("hidden")) {
            this.showStatus("Connecting...", false);
        }
        // Ensure aspect ratio is correct on connect
        this.updateAspectRatio();
    }
    disconnectedCallback() {
        this.iframe.removeEventListener("load", this.handleIframeLoad);
        window.removeEventListener("message", this.handleWindowMessage);
        this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
        this.scrubber.removeEventListener("input", this.handleScrubberInput);
        this.exportBtn.removeEventListener("click", this.renderClientSide);
        this.speedSelector.removeEventListener("change", this.handleSpeedChange);
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.controller) {
            this.controller.pause();
            this.controller.dispose();
        }
    }
    setControlsDisabled(disabled) {
        this.playPauseBtn.disabled = disabled;
        this.scrubber.disabled = disabled;
        this.speedSelector.disabled = disabled;
        // Export is managed separately based on connection state
        if (disabled) {
            this.exportBtn.disabled = true;
        }
    }
    handleIframeLoad = () => {
        if (!this.iframe.contentWindow)
            return;
        // Clear any existing timeout
        if (this.connectionTimeout)
            window.clearTimeout(this.connectionTimeout);
        // 1. Try Direct Mode (Legacy/Local)
        let directInstance;
        try {
            directInstance = this.iframe.contentWindow.helios;
        }
        catch (e) {
            // Access denied (Cross-origin)
            console.log("HeliosPlayer: Direct access to iframe denied (likely cross-origin).");
        }
        if (directInstance) {
            console.log("HeliosPlayer: Connected via Direct Mode.");
            this.hideStatus();
            this.directHelios = directInstance;
            this.setController(new DirectController(directInstance, this.iframe));
            this.exportBtn.disabled = false;
            return;
        }
        else {
            this.directHelios = null;
            this.exportBtn.disabled = true; // Wait for bridge connection
            console.log("HeliosPlayer: Waiting for Bridge connection...");
        }
        // Start timeout for bridge
        this.connectionTimeout = window.setTimeout(() => {
            this.showStatus("Connection Failed. Check window.helios.", true);
        }, 3000);
        // 2. Initiate Bridge Mode (always try to connect)
        this.iframe.contentWindow.postMessage({ type: 'HELIOS_CONNECT' }, '*');
    };
    handleWindowMessage = (event) => {
        // Check if this message is a handshake response
        if (event.data?.type === 'HELIOS_READY') {
            if (this.connectionTimeout)
                window.clearTimeout(this.connectionTimeout);
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
        this.setControlsDisabled(false);
        const state = this.controller.getState();
        if (state) {
            this.scrubber.max = String(state.duration * state.fps);
            this.updateUI(state);
        }
        this.unsubscribe = this.controller.subscribe((s) => this.updateUI(s));
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
    handleScrubberInput = () => {
        const frame = parseInt(this.scrubber.value, 10);
        if (this.controller) {
            this.controller.seek(frame);
        }
    };
    handleSpeedChange = () => {
        if (this.controller) {
            this.controller.setPlaybackRate(parseFloat(this.speedSelector.value));
        }
    };
    updateUI(state) {
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished) {
            this.playPauseBtn.textContent = "🔄"; // Restart button
        }
        else {
            this.playPauseBtn.textContent = state.isPlaying ? "❚❚" : "▶";
        }
        this.scrubber.value = String(state.currentFrame);
        this.timeDisplay.textContent = `${(state.currentFrame / state.fps).toFixed(2)} / ${state.duration.toFixed(2)}`;
        if (state.playbackRate !== undefined) {
            this.speedSelector.value = String(state.playbackRate);
        }
    }
    // --- Loading / Error UI Helpers ---
    showStatus(msg, isError) {
        this.overlay.classList.remove("hidden");
        this.statusText.textContent = msg;
        this.retryBtn.style.display = isError ? "block" : "none";
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
        const exporter = new ClientSideExporter(this.controller, this.iframe);
        const exportMode = (this.getAttribute("export-mode") || "auto");
        const canvasSelector = this.getAttribute("canvas-selector") || "canvas";
        try {
            await exporter.export({
                onProgress: (p) => {
                    this.exportBtn.textContent = `Cancel (${Math.round(p * 100)}%)`;
                },
                signal: this.abortController.signal,
                mode: exportMode,
                canvasSelector: canvasSelector
            });
        }
        catch (e) {
            console.error("Export failed or aborted", e);
            // Error handling is mostly done inside exporter, but we should reset UI
        }
        finally {
            this.exportBtn.textContent = "Export";
            this.exportBtn.disabled = false;
            this.abortController = null;
        }
    };
}
customElements.define("helios-player", HeliosPlayer);
