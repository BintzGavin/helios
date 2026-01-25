export type TickCallback = (deltaTime: number) => void;

export interface Ticker {
  start(callback: TickCallback): void;
  stop(): void;
}
