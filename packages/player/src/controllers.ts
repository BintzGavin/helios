import { Helios } from "@helios-project/core";

export interface HeliosController {
  play(): void;
  pause(): void;
  seek(frame: number): void;
  subscribe(callback: (state: any) => void): () => void;
  getState(): any;
  dispose(): void;
}

export class DirectController implements HeliosController {
  constructor(public instance: Helios) {}
  play() { this.instance.play(); }
  pause() { this.instance.pause(); }
  seek(frame: number) { this.instance.seek(frame); }
  subscribe(callback: (state: any) => void) { return this.instance.subscribe(callback); }
  getState() { return this.instance.getState(); }
  dispose() { /* No-op for direct */ }
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
    // For now we accept any HELIOS_STATE as we might not know the exact source origin if sandboxed 'null'
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
}
