import { CanvasStrategy } from '../src/strategies/CanvasStrategy';
import { RendererOptions } from '../src/types';

async function runTests() {
  console.log('Running Canvas Implicit Audio Verification...');
  let hasError = false;

  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    mode: 'canvas',
  };

  const strategy = new CanvasStrategy(options);

  // Mock Page
  const mockPage: any = {
    viewportSize: () => ({ width: 1920, height: 1080 }),
    frames: () => [{
        evaluate: async (script: string) => {
            // This mock intercepts the script sent to frames.
            // In dom-scanner.ts, we send a script that returns tracks.
            // We can check if the script contains 'mediaElements'.
            if (typeof script === 'string' && script.includes('mediaElements')) {
                 return [{
                     path: 'audio.mp3',
                     volume: 0.8,
                     offset: 2.0,
                     seek: 0.0
                 }];
            }
            return [];
        }
    }],
    evaluate: async (fnOrString: any, args: any) => {
        // Handle document.fonts.ready
        if (typeof fnOrString === 'function' && fnOrString.toString().includes('fonts.ready')) {
            return true;
        }

        // Handle WebCodecs detection (CanvasStrategy.prepare)
        // Return not supported to fallback to standard behavior for simplicity
        if (typeof fnOrString === 'string' && fnOrString.includes('VideoEncoder')) {
            return { supported: false, reason: 'Mock' };
        }

        return null;
    }
  };

  try {
    console.log('Preparing strategy...');
    await strategy.prepare(mockPage);

    console.log('Checking FFmpeg args...');
    const args = strategy.getFFmpegArgs(options, 'output.mp4');

    // Check if audio file is in args
    const audioIndex = args.indexOf('audio.mp3');
    if (audioIndex === -1) {
        console.error('❌ Failed: audio.mp3 not found in FFmpeg args');
        hasError = true;
    } else {
        console.log('✅ Found audio.mp3 in args');

        // Check input flags (-ss 0 -i audio.mp3)
        // Check filter flags (volume=0.8)
        // Note: FFmpegBuilder adds volume filter if not 1.0.

        const filterComplexIndex = args.indexOf('-filter_complex');
        if (filterComplexIndex !== -1) {
             const filterComplex = args[filterComplexIndex + 1];
             if (filterComplex.includes('volume=0.8')) {
                 console.log('✅ Found volume=0.8 filter');
             } else {
                 console.error('❌ Failed: volume=0.8 filter not found');
                 hasError = true;
             }

             if (filterComplex.includes('adelay=2000|2000')) {
                 console.log('✅ Found adelay=2000|2000 filter (offset 2.0s)');
             } else {
                 console.error('❌ Failed: adelay=2000|2000 filter not found');
                 hasError = true;
             }
        } else {
            console.error('❌ Failed: -filter_complex not found');
            hasError = true;
        }
    }

  } catch (err) {
      console.error('❌ Error during test:', err);
      hasError = true;
  }

  if (hasError) {
    console.error('\n❌ Verification Failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests passed!');
    process.exit(0);
  }
}

runTests();
