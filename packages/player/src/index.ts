import { Helios } from 'helios-core';

const template = document.createElement('template');
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
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
  </div>
`;

export class HeliosPlayer extends HTMLElement {
  private iframe: HTMLIFrameElement;
  private playPauseBtn: HTMLButtonElement;
  private scrubber: HTMLInputElement;
  private timeDisplay: HTMLDivElement;

  private helios: Helios | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.iframe = this.shadowRoot!.querySelector('iframe')!;
    this.playPauseBtn = this.shadowRoot!.querySelector('.play-pause-btn')!;
    this.scrubber = this.shadowRoot!.querySelector('.scrubber')!;
    this.timeDisplay = this.shadowRoot!.querySelector('.time-display')!;
  }

  connectedCallback() {
    this.iframe.addEventListener('load', this.handleIframeLoad);

    // Set src from attribute
    const src = this.getAttribute('src');
    if (src) {
        this.iframe.src = src;
    }

    this.playPauseBtn.addEventListener('click', this.togglePlayPause);
    this.scrubber.addEventListener('input', this.handleScrubberInput);
  }

  disconnectedCallback() {
    this.iframe.removeEventListener('load', this.handleIframeLoad);
    this.playPauseBtn.removeEventListener('click', this.togglePlayPause);
    this.scrubber.removeEventListener('input', this.handleScrubberInput);
    this.helios?.pause();
  }

  private handleIframeLoad = () => {
    if (!this.iframe.contentDocument) return;

    const duration = parseInt(this.getAttribute('duration') || '10', 10);
    const fps = parseInt(this.getAttribute('fps') || '30', 10);

    this.helios = new Helios({ duration, fps });

    this.scrubber.max = String(duration * fps);

    this.helios.subscribe(state => {
        // Update timeline
        if (this.iframe.contentDocument?.timeline) {
            const newTime = (state.currentFrame / state.fps) * 1000;
            this.iframe.contentDocument.timeline.currentTime = newTime;
        }

        // Update UI
        this.playPauseBtn.textContent = state.isPlaying ? '❚❚' : '▶';
        this.scrubber.value = String(state.currentFrame);
        this.timeDisplay.textContent = `${(state.currentFrame / state.fps).toFixed(2)} / ${duration.toFixed(2)}`;
    });
  }

  private togglePlayPause = () => {
    if (this.helios?.getState().isPlaying) {
      this.helios.pause();
    } else {
      this.helios?.play();
    }
  }

  private handleScrubberInput = () => {
    const frame = parseInt(this.scrubber.value, 10);
    this.helios?.seek(frame);
  }
}

customElements.define('helios-player', HeliosPlayer);
