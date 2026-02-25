import type { Helios, CaptionCue, HeliosSchema, DiagnosticReport, Marker } from "@helios-project/core";
import { captureDomToBitmap } from "./features/dom-capture";
import { getAudioAssets, AudioAsset } from "./features/audio-utils";
import { AudioMeter, AudioLevels } from "./features/audio-metering";
import { AudioFader } from "./features/audio-fader";

export interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): Promise<void>;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setAudioTrackVolume(trackId: string, volume: number): void;
  setAudioTrackMuted(trackId: string, muted: boolean): void;
  setLoop(loop: boolean): void;
  setPlaybackRate(rate: number): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setInputProps(props: Record<string, any>): void;
  setDuration(seconds: number): void;
  setFps(fps: number): void;
  setSize(width: number, height: number): void;
  setMarkers(markers: Marker[]): void;
  subscribe(callback: (state: any) => void): () => void;
  onError(callback: (err: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom', width?: number, height?: number }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null>;
  getAudioTracks(): Promise<AudioAsset[]>;
  getSchema(): Promise<HeliosSchema | undefined>;
  diagnose(): Promise<DiagnosticReport>;
  startAudioMetering(): void;
  stopAudioMetering(): void;
  onAudioMetering(callback: (levels: AudioLevels) => void): () => void;
}

export class DirectController implements HeliosController {
  private audioMeter: AudioMeter | null = null;
  private audioFader: AudioFader | null = null;
  private audioMeteringCallback: ((levels: AudioLevels) => void) | null = null;
  private audioMeteringRaf: number | null = null;

  constructor(public instance: Helios, private iframe?: HTMLIFrameElement) {
    this.audioFader = new AudioFader();
    const doc = this.iframe?.contentDocument || document;
    this.audioFader.connect(doc);
  }
  play() { this.instance.play(); }
  pause() { this.instance.pause(); }
  seek(frame: number): Promise<void> {
    this.instance.seek(frame);
    return new Promise((resolve) => {
      const win = this.iframe?.contentWindow || window;
      win.requestAnimationFrame(() => {
        win.requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }
  setAudioVolume(volume: number) { this.instance.setAudioVolume(volume); }
  setAudioMuted(muted: boolean) { this.instance.setAudioMuted(muted); }
  setAudioTrackVolume(trackId: string, volume: number) { this.instance.setAudioTrackVolume(trackId, volume); }
  setAudioTrackMuted(trackId: string, muted: boolean) { this.instance.setAudioTrackMuted(trackId, muted); }
  setLoop(loop: boolean) { this.instance.setLoop(loop); }
  setPlaybackRate(rate: number) { this.instance.setPlaybackRate(rate); }
  setPlaybackRange(start: number, end: number) { this.instance.setPlaybackRange(start, end); }
  clearPlaybackRange() { this.instance.clearPlaybackRange(); }
  setCaptions(captions: string | CaptionCue[]) { this.instance.setCaptions(captions); }
  setInputProps(props: Record<string, any>) { this.instance.setInputProps(props); }
  setDuration(seconds: number) { this.instance.setDuration(seconds); }
  setFps(fps: number) { this.instance.setFps(fps); }
  setSize(width: number, height: number) { this.instance.setSize(width, height); }
  setMarkers(markers: Marker[]) { this.instance.setMarkers(markers); }
  subscribe(callback: (state: any) => void) {
    return this.instance.subscribe((state: any) => {
       if (this.audioFader) {
         if (state.isPlaying) {
           this.audioFader.enable();
         } else {
           this.audioFader.disable();
         }
       }
       callback(state);
    });
  }
  getState() { return this.instance.getState(); }
  dispose() {
    this.stopAudioMetering();
    if (this.audioMeter) {
      this.audioMeter.dispose();
      this.audioMeter = null;
    }
    if (this.audioFader) {
      this.audioFader.dispose();
      this.audioFader = null;
    }
  }

  startAudioMetering() {
    if (!this.audioMeter) {
      this.audioMeter = new AudioMeter();
    }
    const doc = this.iframe?.contentDocument || document;
    this.audioMeter.connect(doc);
    this.audioMeter.enable();

    if (!this.audioMeteringRaf) {
      const loop = () => {
        if (this.audioMeter && this.audioMeteringCallback) {
          const levels = this.audioMeter.getLevels();
          this.audioMeteringCallback(levels);
        }
        this.audioMeteringRaf = requestAnimationFrame(loop);
      };
      this.audioMeteringRaf = requestAnimationFrame(loop);
    }
  }

  stopAudioMetering() {
    if (this.audioMeteringRaf) {
      cancelAnimationFrame(this.audioMeteringRaf);
      this.audioMeteringRaf = null;
    }
    if (this.audioMeter) {
      this.audioMeter.disable();
    }
  }

  onAudioMetering(callback: (levels: AudioLevels) => void): () => void {
    this.audioMeteringCallback = callback;
    return () => {
      this.audioMeteringCallback = null;
    };
  }

  onError(callback: (err: any) => void): () => void {
    const target = this.iframe?.contentWindow || window;

    const errorHandler = (event: ErrorEvent) => {
      callback({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      callback({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    };

    target.addEventListener('error', errorHandler as EventListener);
    target.addEventListener('unhandledrejection', rejectionHandler as EventListener);

    return () => {
      target.removeEventListener('error', errorHandler as EventListener);
      target.removeEventListener('unhandledrejection', rejectionHandler as EventListener);
    };
  }

  async getAudioTracks(): Promise<AudioAsset[]> {
     const doc = this.iframe?.contentDocument || document;
     const state = this.instance.getState();
     return getAudioAssets(doc, state.availableAudioTracks, state.audioTracks);
  }

  async getSchema(): Promise<HeliosSchema | undefined> {
    return this.instance.schema;
  }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom', width?: number, height?: number }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null> {
      const state = this.instance.getState();
      const fps = state.fps;
      const captions = state.activeCaptions || [];
      this.instance.seek(frame);

      // Wait for RAF in iframe to ensure paint
      if (this.iframe && this.iframe.contentWindow) {
         await new Promise<void>(r => this.iframe!.contentWindow!.requestAnimationFrame(() => r()));
         await new Promise<void>(r => this.iframe!.contentWindow!.requestAnimationFrame(() => r()));
      }

      const doc = this.iframe?.contentDocument || document;
      let videoFrame: VideoFrame | null = null;

      // Handle DOM mode
      if (options?.mode === 'dom') {
          try {
             const bitmap = await captureDomToBitmap(doc.body, { targetWidth: options?.width, targetHeight: options?.height });
             videoFrame = new VideoFrame(bitmap, { timestamp: (frame / fps) * 1_000_000 });
          } catch (e) {
             console.error("DOM capture failed:", e);
             return null;
          }
      } else {
        const selector = options?.selector || 'canvas';
        const canvas = doc.querySelector(selector);

        // Use tagName check for cross-frame compatibility
        if (canvas && canvas.tagName === 'CANVAS') {
             const canvasEl = canvas as HTMLCanvasElement;
             let source: CanvasImageSource = canvasEl;

             if (options?.width && options?.height && (canvasEl.width !== options.width || canvasEl.height !== options.height)) {
                 if (typeof OffscreenCanvas !== 'undefined') {
                     const offscreen = new OffscreenCanvas(options.width, options.height);
                     const ctx = offscreen.getContext('2d');
                     if (ctx) {
                         ctx.drawImage(canvasEl, 0, 0, options.width, options.height);
                         source = offscreen;
                     }
                 } else {
                     const tempCanvas = doc.createElement('canvas');
                     tempCanvas.width = options.width;
                     tempCanvas.height = options.height;
                     const ctx = tempCanvas.getContext('2d');
                     if (ctx) {
                         ctx.drawImage(canvasEl, 0, 0, options.width, options.height);
                         source = tempCanvas;
                     }
                 }
             }

             videoFrame = new VideoFrame(source, { timestamp: (frame / fps) * 1_000_000 });
        }
      }

      if (videoFrame) {
          return { frame: videoFrame, captions };
      }
      return null;
  }

  async diagnose(): Promise<DiagnosticReport> {
    return (this.instance.constructor as any).diagnose();
  }
}

export class BridgeController implements HeliosController {
  private listeners: ((state: any) => void)[] = [];
  private errorListeners: ((err: any) => void)[] = [];
  private audioMeteringListeners: ((levels: AudioLevels) => void)[] = [];
  private lastState: any;

  constructor(private iframeWindow: Window, initialState?: any) {
    this.lastState = initialState || { isPlaying: false, currentFrame: 0, duration: 0, fps: 30 };
    window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.source !== this.iframeWindow) return;

    if (event.data?.type === 'HELIOS_STATE') {
      this.lastState = event.data.state;
      this.notifyListeners();
    } else if (event.data?.type === 'HELIOS_ERROR') {
      this.notifyErrorListeners(event.data.error);
    } else if (event.data?.type === 'HELIOS_AUDIO_LEVELS') {
      this.notifyAudioMeteringListeners(event.data.levels);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.lastState));
  }

  private notifyErrorListeners(err: any) {
    this.errorListeners.forEach(cb => cb(err));
  }

  private notifyAudioMeteringListeners(levels: AudioLevels) {
    this.audioMeteringListeners.forEach(cb => cb(levels));
  }

  play() { this.iframeWindow.postMessage({ type: 'HELIOS_PLAY' }, '*'); }
  pause() { this.iframeWindow.postMessage({ type: 'HELIOS_PAUSE' }, '*'); }
  async seek(frame: number): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: number;
      const handler = (event: MessageEvent) => {
        if (event.source !== this.iframeWindow) return;

        if (event.data?.type === 'HELIOS_SEEK_DONE' && event.data.frame === frame) {
          window.removeEventListener('message', handler);
          clearTimeout(timeoutId);
          resolve();
        }
      };

      window.addEventListener('message', handler);
      this.iframeWindow.postMessage({ type: 'HELIOS_SEEK', frame }, '*');

      timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', handler);
        console.warn(`HeliosPlayer: Seek to frame ${frame} timed out`);
        resolve();
      }, 5000);
    });
  }
  setAudioVolume(volume: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_VOLUME', volume }, '*'); }
  setAudioMuted(muted: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_MUTED', muted }, '*'); }
  setAudioTrackVolume(trackId: string, volume: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_VOLUME', trackId, volume }, '*'); }
  setAudioTrackMuted(trackId: string, muted: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_AUDIO_TRACK_MUTED', trackId, muted }, '*'); }
  setLoop(loop: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_LOOP', loop }, '*'); }
  setPlaybackRate(rate: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RATE', rate }, '*'); }
  setPlaybackRange(start: number, end: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RANGE', start, end }, '*'); }
  clearPlaybackRange() { this.iframeWindow.postMessage({ type: 'HELIOS_CLEAR_PLAYBACK_RANGE' }, '*'); }
  setCaptions(captions: string | CaptionCue[]) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_CAPTIONS', captions }, '*'); }
  setInputProps(props: Record<string, any>) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PROPS', props }, '*'); }
  setDuration(duration: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_DURATION', duration }, '*'); }
  setFps(fps: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_FPS', fps }, '*'); }
  setSize(width: number, height: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_SIZE', width, height }, '*'); }
  setMarkers(markers: Marker[]) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_MARKERS', markers }, '*'); }

  startAudioMetering() { this.iframeWindow.postMessage({ type: 'HELIOS_START_METERING' }, '*'); }
  stopAudioMetering() { this.iframeWindow.postMessage({ type: 'HELIOS_STOP_METERING' }, '*'); }

  subscribe(callback: (state: any) => void) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.lastState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  onError(callback: (err: any) => void) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== callback);
    };
  }

  onAudioMetering(callback: (levels: AudioLevels) => void) {
    this.audioMeteringListeners.push(callback);
    return () => {
      this.audioMeteringListeners = this.audioMeteringListeners.filter(l => l !== callback);
    };
  }

  getState() { return this.lastState; }

  dispose() {
      this.stopAudioMetering();
      window.removeEventListener('message', this.handleMessage);
      this.listeners = [];
      this.errorListeners = [];
      this.audioMeteringListeners = [];
  }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom', width?: number, height?: number }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null> {
      return new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
              if (event.source !== this.iframeWindow) return;

              if (event.data?.type === 'HELIOS_FRAME_DATA' && event.data.frame === frame) {
                  window.removeEventListener('message', handler);
                  if (event.data.success) {
                      const bitmap: ImageBitmap = event.data.bitmap;
                      const captions: CaptionCue[] = event.data.captions || [];
                      // fps from last state
                      const fps = this.lastState.fps || 30;
                      const videoFrame = new VideoFrame(bitmap, { timestamp: (frame / fps) * 1_000_000 });
                      resolve({ frame: videoFrame, captions });
                  } else {
                      console.error("Bridge capture failed:", event.data.error);
                      resolve(null);
                  }
              }
          };

          window.addEventListener('message', handler);
          this.iframeWindow.postMessage({
              type: 'HELIOS_CAPTURE_FRAME',
              frame,
              selector: options?.selector,
              mode: options?.mode,
              width: options?.width,
              height: options?.height
          }, '*');

          // Timeout
          setTimeout(() => {
              window.removeEventListener('message', handler);
              resolve(null);
          }, 5000);
      });
  }

  async getAudioTracks(): Promise<AudioAsset[]> {
      return new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
              if (event.source !== this.iframeWindow) return;

              if (event.data?.type === 'HELIOS_AUDIO_DATA') {
                  window.removeEventListener('message', handler);
                  resolve(event.data.assets || []);
              }
          };
          window.addEventListener('message', handler);
          this.iframeWindow.postMessage({ type: 'HELIOS_GET_AUDIO_TRACKS' }, '*');

          // Timeout
          setTimeout(() => {
              window.removeEventListener('message', handler);
              resolve([]);
          }, 5000);
      });
  }

  async getSchema(): Promise<HeliosSchema | undefined> {
      return new Promise((resolve) => {
          let timeoutId: number;
          const handler = (event: MessageEvent) => {
              if (event.source !== this.iframeWindow) return;

              if (event.data?.type === 'HELIOS_SCHEMA') {
                  window.removeEventListener('message', handler);
                  clearTimeout(timeoutId);
                  resolve(event.data.schema);
              }
          };
          window.addEventListener('message', handler);
          this.iframeWindow.postMessage({ type: 'HELIOS_GET_SCHEMA' }, '*');

          // Timeout
          timeoutId = window.setTimeout(() => {
              window.removeEventListener('message', handler);
              resolve(undefined);
          }, 5000);
      });
  }

  async diagnose(): Promise<DiagnosticReport> {
    return new Promise((resolve, reject) => {
      let timeoutId: number;
      const handler = (event: MessageEvent) => {
        if (event.source !== this.iframeWindow) return;

        if (event.data?.type === 'HELIOS_DIAGNOSE_RESULT') {
          window.removeEventListener('message', handler);
          clearTimeout(timeoutId);
          resolve(event.data.report);
        }
      };

      window.addEventListener('message', handler);
      this.iframeWindow.postMessage({ type: 'HELIOS_DIAGNOSE' }, '*');

      // Timeout
      timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Timeout waiting for diagnostics'));
      }, 5000);
    });
  }
}
