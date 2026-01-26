import { Helios } from "@helios-project/core";
import { DirectController, BridgeController } from "./controllers";
import type { HeliosController } from "./controllers";
import { ClientSideExporter } from "./features/exporter";

export type { HeliosController };

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
  </style>
  <div class="status-overlay" part="overlay">
    <div class="status-text">Connecting...</div>
    <button class="retry-btn" style="display: none">Retry</button>
  </div>
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin" title="Helios Composition Preview"></iframe>
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
  private iframe: HTMLIFrameElement;
  private playPauseBtn: HTMLButtonElement;
  private volumeBtn: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private scrubber: HTMLInputElement;
  private timeDisplay: HTMLDivElement;
  private exportBtn: HTMLButtonElement;
  private overlay: HTMLElement;
  private statusText: HTMLElement;
  private retryBtn: HTMLButtonElement;
  private retryAction: () => void;
  private speedSelector: HTMLSelectElement;
  private fullscreenBtn: HTMLButtonElement;
  private captionsContainer: HTMLDivElement;
  private ccBtn: HTMLButtonElement;
  private showCaptions: boolean = false;

  private controller: HeliosController | null = null;
  // Keep track if we have direct access (optional, mainly for debugging/logging)
  private directHelios: Helios | null = null;
  private unsubscribe: (() => void) | null = null;
  private connectionTimeout: number | null = null;
  private abortController: AbortController | null = null;
  private isExporting: boolean = false;
  private isScrubbing: boolean = false;
  private wasPlayingBeforeScrub: boolean = false;

  static get observedAttributes() {
    return ["src", "width", "height", "autoplay", "loop", "controls"];
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
    this.timeDisplay = this.shadowRoot!.querySelector(".time-display")!;
    this.exportBtn = this.shadowRoot!.querySelector(".export-btn")!;
    this.overlay = this.shadowRoot!.querySelector(".status-overlay")!;
    this.statusText = this.shadowRoot!.querySelector(".status-text")!;
    this.retryBtn = this.shadowRoot!.querySelector(".retry-btn")!;
    this.speedSelector = this.shadowRoot!.querySelector(".speed-selector")!;
    this.fullscreenBtn = this.shadowRoot!.querySelector(".fullscreen-btn")!;
    this.captionsContainer = this.shadowRoot!.querySelector(".captions-container")!;
    this.ccBtn = this.shadowRoot!.querySelector(".cc-btn")!;

    this.retryAction = () => this.retryConnection();
    this.retryBtn.onclick = () => this.retryAction();
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal === newVal) return;

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

    if (this.unsubscribe) {
        this.unsubscribe();
    }
    if (this.controller) {
        this.controller.pause();
        this.controller.dispose();
    }
  }

  private setControlsDisabled(disabled: boolean) {
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

  private lockPlaybackControls(locked: boolean) {
      this.playPauseBtn.disabled = locked;
      this.volumeBtn.disabled = locked;
      this.volumeSlider.disabled = locked;
      this.scrubber.disabled = locked;
      this.speedSelector.disabled = locked;
      this.fullscreenBtn.disabled = locked;
      this.ccBtn.disabled = locked;
  }

  private handleIframeLoad = () => {
    if (!this.iframe.contentWindow) return;

    // Clear any existing timeout
    if (this.connectionTimeout) window.clearTimeout(this.connectionTimeout);

    // 1. Try Direct Mode (Legacy/Local)
    let directInstance: Helios | undefined;
    try {
        directInstance = (this.iframe.contentWindow as any).helios as Helios | undefined;
    } catch (e) {
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
    } else {
        this.directHelios = null;
        this.exportBtn.disabled = true; // Wait for bridge connection
        console.log("HeliosPlayer: Waiting for Bridge connection...");
    }

    // Start timeout for bridge
    this.connectionTimeout = window.setTimeout(() => {
      this.showStatus("Connection Failed. Ensure window.helios is set or connectToParent() is called.", true);
    }, 3000);

    // 2. Initiate Bridge Mode (always try to connect)
    this.iframe.contentWindow.postMessage({ type: 'HELIOS_CONNECT' }, '*');
  };

  private handleWindowMessage = (event: MessageEvent) => {
      // Check if this message is a handshake response
      if (event.data?.type === 'HELIOS_READY') {
          if (this.connectionTimeout) window.clearTimeout(this.connectionTimeout);
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
      this.setControlsDisabled(false);

      const state = this.controller.getState();
      if (state) {
          this.scrubber.max = String(state.duration * state.fps);
          this.updateUI(state);
      }

      this.unsubscribe = this.controller.subscribe((s) => this.updateUI(s));

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
    const state = this.controller.getState();
    this.wasPlayingBeforeScrub = state.isPlaying;

    if (this.wasPlayingBeforeScrub) {
      this.controller.pause();
    }
  };

  private handleScrubEnd = () => {
    if (!this.controller) return;
    this.isScrubbing = false;

    if (this.wasPlayingBeforeScrub) {
      this.controller.play();
    }
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
      const isFinished = state.currentFrame >= state.duration * state.fps - 1;

      if (isFinished && this.hasAttribute("loop")) {
        // Prevent infinite loop if something goes wrong, only restart if we stopped
        if (!state.isPlaying) {
             this.controller!.seek(0);
             this.controller!.play();
             return;
        }
      }

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

      this.captionsContainer.innerHTML = '';
      if (this.showCaptions && state.activeCaptions && state.activeCaptions.length > 0) {
        state.activeCaptions.forEach((cue: any) => {
          const div = document.createElement('div');
          div.className = 'caption-cue';
          div.textContent = cue.text;
          this.captionsContainer.appendChild(div);
        });
      }
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

  private retryConnection() {
    this.showStatus("Retrying...", false);
    // Reload iframe to force fresh start
    const src = this.iframe.src;
    this.iframe.src = src;
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

    try {
        await exporter.export({
            onProgress: (p) => {
                this.exportBtn.textContent = `Cancel (${Math.round(p * 100)}%)`;
            },
            signal: this.abortController.signal,
            mode: exportMode,
            canvasSelector: canvasSelector
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

customElements.define("helios-player", HeliosPlayer);
