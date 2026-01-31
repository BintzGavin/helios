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
    headless: true,
    // Use 'cat' as ffmpeg so it just consumes stdin and exits when closed
    // actually, we will use a custom node script to ensure it behaves nicely
    ffmpegPath: process.execPath
  };

  const renderer = new Renderer(options);

  // Mock the strategy
  const strategy = (renderer as any).strategy as CanvasStrategy;

  let capturedFrames = 0;

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
  let generatedArgs: string[] = [];

  // Mock getFFmpegArgs to return args for our dummy script
  strategy.getFFmpegArgs = (opts, outPath) => {
    // Generate real args to verify them later
    generatedArgs = FFmpegBuilder.getArgs(opts, outPath, []);

    // Return args for "node -e 'process.stdin.resume(); process.stdin.on(`end`, ()=>process.exit(0));'"
    // We can use -e for inline script
    return [
        '-e',
        'process.stdin.resume(); process.stdin.on("end", () => process.exit(0));'
    ];
  };

  try {
    // Run render
    // Use about:blank to minimize browser overhead
    await renderer.render('about:blank', outputPath);

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

    const args = FFmpegBuilder.getArgs(options, 'out.mp4', []);
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
