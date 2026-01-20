import { Helios } from "@helios-project/core";
import { CanvasExportStrategy } from "./strategies/CanvasExportStrategy";
import { DomExportStrategy } from "./strategies/DomExportStrategy";
import { ExportStrategy } from "./strategies/ExportStrategy";

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
  </style>
  <iframe part="iframe"></iframe>
  <div class="controls">
    <button class="play-pause-btn" part="play-pause-button">▶</button>
    <button class="export-btn" part="export-button">Export</button>
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
  </div>
`;

export class HeliosPlayer extends HTMLElement {
  private iframe: HTMLIFrameElement;
  private playPauseBtn: HTMLButtonElement;
  private scrubber: HTMLInputElement;
  private timeDisplay: HTMLDivElement;
  private exportBtn: HTMLButtonElement;

  // The Helios instance driving the animation.
  // This can be a local instance (fallback) or a remote instance (from iframe).
  private helios: Helios | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.iframe = this.shadowRoot!.querySelector("iframe")!;
    this.playPauseBtn = this.shadowRoot!.querySelector(".play-pause-btn")!;
    this.scrubber = this.shadowRoot!.querySelector(".scrubber")!;
    this.timeDisplay = this.shadowRoot!.querySelector(".time-display")!;
    this.exportBtn = this.shadowRoot!.querySelector(".export-btn")!;
  }

  connectedCallback() {
    this.iframe.addEventListener("load", this.handleIframeLoad);

    // Set src from attribute
    const src = this.getAttribute("src");
    if (src) {
      this.iframe.src = src;
    }

    this.playPauseBtn.addEventListener("click", this.togglePlayPause);
    this.scrubber.addEventListener("input", this.handleScrubberInput);
    this.exportBtn.addEventListener("click", this.handleExport);
  }

  disconnectedCallback() {
    this.iframe.removeEventListener("load", this.handleIframeLoad);
    this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
    this.scrubber.removeEventListener("input", this.handleScrubberInput);
    this.exportBtn.removeEventListener("click", this.handleExport);
    this.helios?.pause();
  }

  private handleIframeLoad = () => {
    if (!this.iframe.contentWindow) return;

    // Check for Helios instance in the iframe
    const remoteHelios = (this.iframe.contentWindow as any).helios as Helios | undefined;

    if (remoteHelios) {
        console.log("HeliosPlayer: Connected to remote Helios instance in iframe.");
        this.helios = remoteHelios;
        this.playPauseBtn.disabled = false;
        this.exportBtn.disabled = false;
        this.scrubber.disabled = false;
    } else {
        console.warn("HeliosPlayer: No Helios instance found in iframe (window.helios). Player controls will not function.");
        this.playPauseBtn.disabled = true;
        this.exportBtn.disabled = true;
        this.scrubber.disabled = true;
        return;
    }

    const state = this.helios.getState();
    this.scrubber.max = String(state.duration * state.fps);
    this.updateUI(state); // Initial UI update

    this.setupHeliosSubscription();
  };

  private togglePlayPause = () => {
    if (!this.helios) return;
    const state = this.helios.getState();

    const isFinished = state.currentFrame >= state.duration * state.fps - 1;

    if (isFinished) {
      // Restart the animation
      this.helios.seek(0);
      this.helios.play();
    } else if (state.isPlaying) {
      this.helios.pause();
    } else {
      this.helios.play();
    }
  };

  private handleScrubberInput = () => {
    const frame = parseInt(this.scrubber.value, 10);
    if (this.helios) {
      this.helios.seek(frame);
    }
  };

  private updateUI(state: any) {
      const isFinished = state.currentFrame >= state.duration * state.fps - 1;
      if (isFinished) {
        this.playPauseBtn.textContent = "🔄"; // Restart button
      } else {
        this.playPauseBtn.textContent = state.isPlaying ? "❚❚" : "▶";
      }

      this.scrubber.value = String(state.currentFrame);
      this.timeDisplay.textContent = `${(
        state.currentFrame / state.fps
      ).toFixed(2)} / ${state.duration.toFixed(2)}`;
  }

  private setupHeliosSubscription() {
    if (!this.helios) return;

    this.helios.subscribe((state: any) => {
      // Since we are driving the remote instance, the iframe content should update itself
      // (because it should be subscribed to its own helios instance).
      // So we only need to update our UI.
      this.updateUI(state);
    });
  }

  private handleExport = async () => {
    if (!this.helios) return;
    console.log("Client-side rendering started!");
    this.exportBtn.disabled = true;
    this.exportBtn.textContent = "Rendering...";

    // Pause playback before rendering
    this.helios.pause();

    try {
      // Check if this is a canvas-based or DOM-based composition
      // We look for a canvas in the iframe
      const canvas =
        this.iframe.contentWindow?.document.querySelector("canvas");
      const isCanvasBased = !!canvas;

      let strategy: ExportStrategy;
      if (isCanvasBased) {
        strategy = new CanvasExportStrategy();
      } else {
        strategy = new DomExportStrategy();
      }

      await strategy.export(this.helios, this.iframe, (progress) => {
        this.exportBtn.textContent = `Rendering: ${Math.round(
          progress * 100
        )}%`;
      });

      console.log("Client-side rendering and download finished!");
    } catch (e: any) {
      console.error("Client-side rendering failed:", e);
      alert(`Rendering failed: ${e.message}`);
    } finally {
      this.exportBtn.disabled = false;
      this.exportBtn.textContent = "Export";
    }
  };
}

customElements.define("helios-player", HeliosPlayer);
