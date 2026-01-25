import { Helios } from "@helios-project/core";

export interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  setPlaybackRate(rate: number): void;
  setInputProps(props: Record<string, any>): void;
  subscribe(callback: (state: any) => void): () => void;
  getState(): any;
  dispose(): void;
  captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<VideoFrame | null>;
}

export class DirectController implements HeliosController {
  constructor(public instance: Helios, private iframe?: HTMLIFrameElement) {}
  play() { this.instance.play(); }
  pause() { this.instance.pause(); }
  seek(frame: number) { this.instance.seek(frame); }
  setPlaybackRate(rate: number) { this.instance.setPlaybackRate(rate); }
  setInputProps(props: Record<string, any>) { this.instance.setInputProps(props); }
  subscribe(callback: (state: any) => void) { return this.instance.subscribe(callback); }
  getState() { return this.instance.getState(); }
  dispose() { /* No-op for direct */ }

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<VideoFrame | null> {
      const fps = this.instance.getState().fps;
      this.instance.seek(frame);

      // Wait for RAF in iframe to ensure paint
      if (this.iframe && this.iframe.contentWindow) {
         await new Promise<void>(r => this.iframe!.contentWindow!.requestAnimationFrame(() => r()));
         await new Promise<void>(r => this.iframe!.contentWindow!.requestAnimationFrame(() => r()));
      }

      // If mode is DOM, we might need special handling, but for now we focus on Canvas
      // For DOM, ClientSideExporter has logic that might need to remain there or be moved.
      // But adhering to the interface:

      const doc = this.iframe?.contentDocument || document;
      const selector = options?.selector || 'canvas';
      const canvas = doc.querySelector(selector);

      if (canvas instanceof HTMLCanvasElement) {
           return new VideoFrame(canvas, { timestamp: (frame / fps) * 1_000_000 });
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

  async captureFrame(frame: number, options?: { selector?: string, mode?: 'canvas' | 'dom' }): Promise<VideoFrame | null> {
      // Bridge only supports canvas for now
      if (options?.mode === 'dom') {
          console.warn("BridgeController does not support DOM export yet.");
          return null;
      }

      return new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
              if (event.data?.type === 'HELIOS_FRAME_DATA' && event.data.frame === frame) {
                  window.removeEventListener('message', handler);
                  if (event.data.success) {
                      const bitmap: ImageBitmap = event.data.bitmap;
                      // fps from last state
                      const fps = this.lastState.fps || 30;
                      const videoFrame = new VideoFrame(bitmap, { timestamp: (frame / fps) * 1_000_000 });
                      resolve(videoFrame);
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
              selector: options?.selector
          }, '*');

          // Timeout
          setTimeout(() => {
              window.removeEventListener('message', handler);
              resolve(null);
          }, 5000);
      });
  }
}
