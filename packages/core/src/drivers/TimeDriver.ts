export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number, options?: { isPlaying: boolean; playbackRate: number; volume?: number; muted?: boolean }): void;
}
