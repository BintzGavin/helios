import { Renderer, RendererOptions } from '../src/index.js';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

async function verifyTransparency() {
  const outputPath = path.join(process.cwd(), 'test-transparency.mov');

  // Clean up previous run
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const options: RendererOptions = {
    width: 128,
    height: 128,
    fps: 1,
    durationInSeconds: 1,
    mode: 'dom',
    pixelFormat: 'rgba',
    videoCodec: 'png',
    ffmpegPath: ffmpeg.path
  };

  const renderer = new Renderer(options);

  console.log('Rendering transparent video...');

  // Capture logs
  const logs: string[] = [];
  const originalError = console.error;
  const originalLog = console.log;

  console.error = (...args) => {
    logs.push(args.join(' '));
    originalError(...args);
  };

  // Renderer uses console.error for ffmpeg stderr output

  const compositionUrl = 'data:text/html,<html><body style="background: transparent; margin: 0;"></body></html>';

  try {
    await renderer.render(compositionUrl, outputPath);
    originalLog('Render complete.');
  } catch (e) {
    originalError('Render failed:', e);
    process.exit(1);
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }

  // Analyze logs for Input stream format
  const logContent = logs.join('\n');

  // Look for: "Stream #0:0: Video: png, rgb24(pc)" (Opaque)
  // vs "Stream #0:0: Video: png, rgba(pc)" (Transparent)
  // The regex should match the Input stream section.

  // We need to be careful not to match the Output stream which might be forced to rgba.
  // Input stream is usually "Input #0, image2pipe"

  const inputMatch = logContent.match(/Input #0, image2pipe[\s\S]*?Stream #0:0: Video: png, (\w+)/);

  if (inputMatch) {
      const pixelFormat = inputMatch[1];
      console.log(`Detected Input Pixel Format: ${pixelFormat}`);

      if (pixelFormat.startsWith('rgba') || pixelFormat.startsWith('yuva') || pixelFormat.startsWith('pal8')) {
          console.log('✅ Transparency verified (Input has alpha).');
          // Cleanup
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          process.exit(0);
      } else if (pixelFormat.startsWith('rgb24') || pixelFormat.startsWith('yuv')) {
          console.error(`❌ Transparency Check Failed. Input format is ${pixelFormat} (Opaque).`);
          process.exit(1);
      } else {
          console.warn(`⚠️ Unknown input format: ${pixelFormat}. Assuming failure.`);
          process.exit(1);
      }
  } else {
      console.error('❌ Could not find Input stream info in ffmpeg logs.');
      process.exit(1);
  }
}

verifyTransparency();
