import { Renderer } from '../src/index';
import { RendererOptions } from '../src/types';
import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import path from 'path';
import fs from 'fs';

async function verifyFrameCount() {
  console.log('Verifying frameCount support...');

  const outputPath = path.resolve('test-frame-count.mp4');

  // Clean up previous run
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Options: 100 frames requested, but duration says 10 seconds (at 30fps = 300 frames).
  // We expect frameCount (100) to win.
  const options: RendererOptions = {
    width: 100,
    height: 100,
    fps: 30,
    durationInSeconds: 10, // Intentionally conflicting
    frameCount: 100,       // This should take precedence
    mode: 'canvas',
    videoCodec: 'libx264',
    browserConfig: {
      headless: true
    },
    // Use 'cat' as ffmpeg so it just consumes stdin and exits when closed
    // actually, we will use a custom node script to ensure it behaves nicely
    ffmpegPath: process.execPath
  };

  const renderer = new Renderer(options);

  let capturedFrames = 0;
  let generatedArgs: string[] = [];

  // Create a mock strategy instance
  const strategy = new CanvasStrategy(options) as any;
  strategy.prepare = async (page) => {
    console.log('Mock strategy.prepare called');
  };
  strategy.diagnose = async (page) => {
    return {};
  };
  strategy.capture = async (page, time) => {
    capturedFrames++;
    return Buffer.from('dummy-frame-data');
  };
  strategy.finish = async (page) => {
    return Buffer.alloc(0);
  };
  const realGetArgs = strategy.getFFmpegArgs.bind(strategy);
  strategy.getFFmpegArgs = (opts, outPath) => {
    // Generate real args to verify them later
    const config = FFmpegBuilder.getArgs(opts, outPath, []);
    generatedArgs = config.args;

    // Return args for "node -e 'process.stdin.resume(); process.stdin.on(`end`, ()=>process.exit(0));'"
    // We can use -e for inline script
    return {
        args: [
            '-e',
            'process.stdin.resume(); process.stdin.on("end", () => process.exit(0));'
        ],
        inputBuffers: [] 
    };
  };

  try {
    // Actually, just intercepting CanvasStrategy constructor would be better, but we can't easily.
    // Let's monkey-patch the prototype of CanvasStrategy since this is a test.
    const origPrepare = CanvasStrategy.prototype.prepare;
    const origCapture = CanvasStrategy.prototype.capture;
    const origFinish = CanvasStrategy.prototype.finish;
    const origGetArgs = CanvasStrategy.prototype.getFFmpegArgs;

    CanvasStrategy.prototype.prepare = strategy.prepare;
    CanvasStrategy.prototype.capture = strategy.capture;
    CanvasStrategy.prototype.finish = strategy.finish;
    CanvasStrategy.prototype.getFFmpegArgs = strategy.getFFmpegArgs;

    // Run render
    // Use about:blank to minimize browser overhead
    await renderer.render('about:blank', outputPath);

    // Restore
    CanvasStrategy.prototype.prepare = origPrepare;
    CanvasStrategy.prototype.capture = origCapture;
    CanvasStrategy.prototype.finish = origFinish;
    CanvasStrategy.prototype.getFFmpegArgs = origGetArgs;

    console.log(`Captured ${capturedFrames} frames.`);

    if (capturedFrames !== 100) {
      console.error(`❌ Failed: Expected 100 frames, got ${capturedFrames}`);
      process.exit(1);
    } else {
        console.log(`✅ Frame count verified: ${capturedFrames}`);
    }

    // Verify FFmpeg Args
    const tIndex = generatedArgs.indexOf('-t');
    if (tIndex === -1) {
         console.log('⚠️ Audio track not present, skipping -t verification in FFmpeg args.');
    } else {
        const tValue = parseFloat(generatedArgs[tIndex + 1]);
        const expectedDuration = 100 / 30;
        if (Math.abs(tValue - expectedDuration) < 0.001) {
             console.log(`✅ FFmpeg duration verified: ${tValue}`);
        } else {
             console.error(`❌ FFmpeg duration mismatch: Expected ~${expectedDuration}, got ${tValue}`);
        }
    }

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

async function verifyAudioDuration() {
    console.log('\nVerifying Audio Duration Logic...');

    const options: RendererOptions = {
        width: 100,
        height: 100,
        fps: 30,
        durationInSeconds: 10,
        frameCount: 100,
        mode: 'canvas',
        audioFilePath: 'dummy.mp3'
    };

    const args = FFmpegBuilder.getArgs(options, 'out.mp4', []).args;
    const tIndex = args.indexOf('-t');

    if (tIndex === -1) {
        console.error('❌ Failed: -t argument missing when audio is present');
        process.exit(1);
    }

    const tValue = parseFloat(args[tIndex + 1]);
    const expectedDuration = 100 / 30;

    if (Math.abs(tValue - expectedDuration) < 0.001) {
        console.log(`✅ Audio duration verified: ${tValue} (Expected: ~${expectedDuration})`);
    } else {
        console.error(`❌ Audio duration mismatch: Expected ~${expectedDuration}, got ${tValue}`);
        process.exit(1);
    }
}

async function run() {
    await verifyFrameCount();
    await verifyAudioDuration();
}

run();
