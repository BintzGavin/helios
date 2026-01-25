export interface TimeDriver {
  init(scope: HTMLElement | Document): void;
  update(timeInMs: number): void;
}
