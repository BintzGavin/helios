import { Helios } from 'helios-core';
import { MP4Muxer } from 'mp4-muxer';

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

  private helios: Helios | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.iframe = this.shadowRoot!.querySelector('iframe')!;
    this.playPauseBtn = this.shadowRoot!.querySelector('.play-pause-btn')!;
    this.scrubber = this.shadowRoot!.querySelector('.scrubber')!;
    this.timeDisplay = this.shadowRoot!.querySelector('.time-display')!;
    this.exportBtn = this.shadowRoot!.querySelector('.export-btn')!;
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
    this.exportBtn.addEventListener('click', this.renderClientSide);
  }

  disconnectedCallback() {
    this.iframe.removeEventListener('load', this.handleIframeLoad);
    this.playPauseBtn.removeEventListener('click', this.togglePlayPause);
    this.scrubber.removeEventListener('input', this.handleScrubberInput);
    this.exportBtn.removeEventListener('click', this.renderClientSide);
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

  private renderClientSide = async () => {
    if (!this.helios) return;
    console.log('Client-side rendering started!');
    this.exportBtn.disabled = true;
    this.exportBtn.textContent = 'Rendering...';

    try {
      const state = this.helios.getState();
      const totalFrames = state.duration * state.fps;
      const canvas = this.iframe.contentWindow?.document.querySelector('canvas');

      if (!canvas) {
        throw new Error('Could not find canvas element in the composition.');
      }

      const muxer = new MP4Muxer({
        target: new MP4Muxer.ArrayBufferTarget(),
        fastStart: true,
        firstTimestampBehavior: 'offset',
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          if (meta) {
            muxer.addVideoChunk(chunk, meta);
          }
        },
        error: (e) => {
          throw e;
        },
      });

      const config = {
        codec: 'avc1.42001E', // H.264 Baseline
        width: canvas.width,
        height: canvas.height,
        framerate: state.fps,
        bitrate: 5_000_000, // 5 Mbps
      };

      if (!(await VideoEncoder.isConfigSupported(config))) {
        throw new Error(`Unsupported VideoEncoder config: ${JSON.stringify(config)}`);
      }

      encoder.configure(config);

      for (let i = 0; i < totalFrames; i++) {
        this.helios.seek(i);
        await new Promise(r => this.iframe.contentWindow?.requestAnimationFrame(r));

        const frame = new VideoFrame(canvas, { timestamp: (i / state.fps) * 1_000_000 });
        const keyFrame = i % (state.fps * 2) === 0;

        encoder.encode(frame, { keyFrame });
        frame.close();
        this.exportBtn.textContent = `Rendering: ${Math.round(((i + 1) / totalFrames) * 100)}%`;
      }

      await encoder.flush();
      const buffer = muxer.finalize();

      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'video.mp4';
      a.click();
      URL.revokeObjectURL(url);

      console.log('Client-side rendering and download finished!');

    } catch (e: any) {
        console.error('Client-side rendering failed:', e);
        alert(`Rendering failed: ${e.message}`);
    } finally {
        this.exportBtn.disabled = false;
        this.exportBtn.textContent = 'Export';
    }
  }
}

customElements.define('helios-player', HeliosPlayer);
