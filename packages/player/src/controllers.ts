import { Helios, CaptionCue, HeliosSchema } from "@helios-project/core";
import { captureDomToBitmap } from "./features/dom-capture";
import { getAudioAssets, AudioAsset } from "./features/audio-utils";

export interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setLoop(loop: boolean): void;
  setPlaybackRate(rate: number): void;
  setPlaybackRange(startFrame: number, endFrame: number): void;
  clearPlaybackRange(): void;
  setCaptions(captions: string | CaptionCue[]): void;
  setInputProps(props: Record<string, any>): void;
  subscribe(callback: (state: any) => void): () => void;
  onError(callback: (err: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null>;
  getAudioTracks(): Promise<AudioAsset[]>;
  getSchema(): Promise<HeliosSchema | undefined>;
}

export class DirectController implements HeliosController {
  constructor(public instance: Helios, private iframe?: HTMLIFrameElement) {}
  play() { this.instance.play(); }
  pause() { this.instance.pause(); }
  seek(frame: number) { this.instance.seek(frame); }
  setAudioVolume(volume: number) { this.instance.setAudioVolume(volume); }
  setAudioMuted(muted: boolean) { this.instance.setAudioMuted(muted); }
  setLoop(loop: boolean) { this.instance.setLoop(loop); }
  setPlaybackRate(rate: number) { this.instance.setPlaybackRate(rate); }
  setPlaybackRange(start: number, end: number) { this.instance.setPlaybackRange(start, end); }
  clearPlaybackRange() { this.instance.clearPlaybackRange(); }
  setCaptions(captions: string | CaptionCue[]) { this.instance.setCaptions(captions); }
  setInputProps(props: Record<string, any>) { this.instance.setInputProps(props); }
  subscribe(callback: (state: any) => void) { return this.instance.subscribe(callback); }
  getState() { return this.instance.getState(); }
  dispose() { /* No-op for direct */ }

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
     return getAudioAssets(doc);
  }

  async getSchema(): Promise<HeliosSchema | undefined> {
    return this.instance.schema;
  }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null> {
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
             const bitmap = await captureDomToBitmap(doc.body);
             videoFrame = new VideoFrame(bitmap, { timestamp: (frame / fps) * 1_000_000 });
          } catch (e) {
             console.error("DOM capture failed:", e);
             return null;
          }
      } else {
        const selector = options?.selector || 'canvas';
        const canvas = doc.querySelector(selector);

        if (canvas instanceof HTMLCanvasElement) {
             videoFrame = new VideoFrame(canvas, { timestamp: (frame / fps) * 1_000_000 });
        }
      }

      if (videoFrame) {
          return { frame: videoFrame, captions };
      }
      return null;
  }
}

export class BridgeController implements HeliosController {
  private listeners: ((state: any) => void)[] = [];
  private errorListeners: ((err: any) => void)[] = [];
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
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.lastState));
  }

  private notifyErrorListeners(err: any) {
    this.errorListeners.forEach(cb => cb(err));
  }

  play() { this.iframeWindow.postMessage({ type: 'HELIOS_PLAY' }, '*'); }
  pause() { this.iframeWindow.postMessage({ type: 'HELIOS_PAUSE' }, '*'); }
  seek(frame: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SEEK', frame }, '*'); }
  setAudioVolume(volume: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_VOLUME', volume }, '*'); }
  setAudioMuted(muted: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_MUTED', muted }, '*'); }
  setLoop(loop: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_LOOP', loop }, '*'); }
  setPlaybackRate(rate: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RATE', rate }, '*'); }
  setPlaybackRange(start: number, end: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RANGE', start, end }, '*'); }
  clearPlaybackRange() { this.iframeWindow.postMessage({ type: 'HELIOS_CLEAR_PLAYBACK_RANGE' }, '*'); }
  setCaptions(captions: string | CaptionCue[]) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_CAPTIONS', captions }, '*'); }
  setInputProps(props: Record<string, any>) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PROPS', props }, '*'); }

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

  getState() { return this.lastState; }

  dispose() {
      window.removeEventListener('message', this.handleMessage);
      this.listeners = [];
      this.errorListeners = [];
  }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null> {
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
              mode: options?.mode
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
}
