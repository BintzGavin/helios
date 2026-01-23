export interface RendererOptions {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  /**
   * The rendering mode to use.
   * - 'canvas': Captures frames by converting the first <canvas> element to a data URL. Best for canvas-based animations.
   * - 'dom': Captures frames by taking a screenshot of the entire viewport. Best for CSS/DOM-based animations.
   *
   * Defaults to 'canvas'.
   */
  mode?: 'canvas' | 'dom';
}
