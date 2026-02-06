import { RenderExecutor } from './RenderExecutor.js';
import { Renderer } from '../Renderer.js';
import { RendererOptions, RenderJobOptions } from '../types.js';

export class LocalExecutor implements RenderExecutor {
  async render(compositionUrl: string, outputPath: string, options: RendererOptions, jobOptions?: RenderJobOptions): Promise<void> {
    const renderer = new Renderer(options);
    await renderer.render(compositionUrl, outputPath, jobOptions);
  }
}
