import { Helios, CaptionCue } from "@helios-project/core";
import { captureDomToBitmap } from "./features/dom-capture";
import { getAudioAssets, AudioAsset } from "./features/audio-utils";

export interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setAudioVolume(volume: number): void;
  setAudioMuted(muted: boolean): void;
  setPlaybackRate(rate: number): void;
  setInputProps(props: Record<string, any>): void;
  subscribe(callback: (state: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null>;
  getAudioTracks(): Promise<AudioAsset[]>;
}

export class DirectController implements HeliosController {
  constructor(public instance: Helios, private iframe?: HTMLIFrameElement) {}
  play() { this.instance.play(); }
  pause() { this.instance.pause(); }
  seek(frame: number) { this.instance.seek(frame); }
  setAudioVolume(volume: number) { this.instance.setAudioVolume(volume); }
  setAudioMuted(muted: boolean) { this.instance.setAudioMuted(muted); }
  setPlaybackRate(rate: number) { this.instance.setPlaybackRate(rate); }
  setInputProps(props: Record<string, any>) { this.instance.setInputProps(props); }
  subscribe(callback: (state: any) => void) { return this.instance.subscribe(callback); }
  getState() { return this.instance.getState(); }
  dispose() { /* No-op for direct */ }

  async getAudioTracks(): Promise<AudioAsset[]> {
     const doc = this.iframe?.contentDocument || document;
     return getAudioAssets(doc);
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
  private lastState: any;

  constructor(private iframeWindow: Window, initialState?: any) {
    this.lastState = initialState || { isPlaying: false, currentFrame: 0, duration: 0, fps: 30 };
    window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    // Only accept messages from valid sources?
    if (event.data?.type === 'HELIOS_STATE') {
      this.lastState = event.data.state;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.lastState));
  }

  play() { this.iframeWindow.postMessage({ type: 'HELIOS_PLAY' }, '*'); }
  pause() { this.iframeWindow.postMessage({ type: 'HELIOS_PAUSE' }, '*'); }
  seek(frame: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SEEK', frame }, '*'); }
  setAudioVolume(volume: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_VOLUME', volume }, '*'); }
  setAudioMuted(muted: boolean) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_MUTED', muted }, '*'); }
  setPlaybackRate(rate: number) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PLAYBACK_RATE', rate }, '*'); }
  setInputProps(props: Record<string, any>) { this.iframeWindow.postMessage({ type: 'HELIOS_SET_PROPS', props }, '*'); }

  subscribe(callback: (state: any) => void) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback(this.lastState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getState() { return this.lastState; }

  dispose() {
      window.removeEventListener('message', this.handleMessage);
  }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<{ frame: VideoFrame, captions: CaptionCue[] } | null> {
      return new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
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
}
