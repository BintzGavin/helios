import { Command } from 'commander';
import path from 'path';
import { pathToFileURL } from 'url';
import { Renderer } from '@helios-project/renderer';

export function registerRenderCommand(program: Command) {
  program
    .command('render <input>')
    .description('Render a composition to video')
    .option('-o, --output <path>', 'Output file path', 'output.mp4')
    .option('--width <number>', 'Viewport width', '1920')
    .option('--height <number>', 'Viewport height', '1080')
    .option('--fps <number>', 'Frames per second', '30')
    .option('--duration <number>', 'Duration in seconds', '1')
    .option('--quality <number>', 'CRF quality (0-51)')
    .option('--mode <mode>', 'Render mode (canvas or dom)', 'canvas')
    .option('--no-headless', 'Run in visible browser window (default: headless)')
    .action(async (input, options) => {
      try {
        const url = input.startsWith('http')
          ? input
          : pathToFileURL(path.resolve(process.cwd(), input)).href;
        const outputPath = path.resolve(process.cwd(), options.output);

        console.log(`Initializing renderer...`);
        console.log(`Input: ${url}`);
        console.log(`Output: ${outputPath}`);

        const renderer = new Renderer({
          width: parseInt(options.width, 10),
          height: parseInt(options.height, 10),
          fps: parseInt(options.fps, 10),
          durationInSeconds: parseInt(options.duration, 10),
          crf: options.quality ? parseInt(options.quality, 10) : undefined,
          mode: options.mode as 'canvas' | 'dom',
          browserConfig: {
            headless: options.headless, // 'no-headless' sets this to false
          },
        });

        await renderer.render(url, outputPath);
        console.log('Render complete.');
      } catch (err: any) {
        console.error('Render failed:', err.message);
        process.exit(1);
      }
    });
}
