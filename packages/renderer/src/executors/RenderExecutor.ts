import { RendererOptions, RenderJobOptions } from '../types.js';

export interface RenderExecutor {
  render(compositionUrl: string, outputPath: string, options: RendererOptions, jobOptions?: RenderJobOptions): Promise<void>;
}
