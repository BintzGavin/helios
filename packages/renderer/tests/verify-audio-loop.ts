import { chromium } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { RendererOptions } from '../src/types.js';
import path from 'path';

async function run() {
  console.log('Starting Audio Loop Verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Mock audio files to prevent network errors
  await page.route('**/*.mp3', route => {
    route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from('mock audio data')
    });
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <!-- Track 1: Looped -->
      <audio src="loop.mp3" loop></audio>

      <!-- Track 2: Play once -->
      <audio src="once.mp3"></audio>

      <!-- Track 3: Looped Video (should also work) -->
      <video src="loop-video.mp4" loop muted></video>

      <!-- Track 4: Looped + Offset (Edge Case) -->
      <audio src="loop-offset.mp3" loop data-helios-offset="2"></audio>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);

  // Initialize Strategy
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    mode: 'dom',
    videoCodec: 'libx264', // Required for DomStrategy
    audioCodec: 'aac'
  };

  const strategy = new DomStrategy(options);

  console.log('Preparing strategy...');
  await strategy.prepare(page);

  console.log('Generating FFmpeg arguments...');
  const { args } = strategy.getFFmpegArgs(options, 'output.mp4');

  // Verify args
  console.log('FFmpeg Args:', args);

  // We expect 3 inputs (audio, audio, video-audio).
  // Note: DomStrategy discovers tracks.

  // Helper to find index of input file
  const findInputIndex = (filename: string) => args.indexOf(filename);

  const loopMp3Index = findInputIndex('loop.mp3'); // May be absolute path if scanner resolves it, but page.setContent uses relative.
  // Actually scanner returns 'currentSrc' which is usually absolute.
  // Playwright's page.setContent might result in about:blank relative URLs or localhost?
  // Let's check what scanner returns.

  // To make it robust, let's verify if -stream_loop -1 appears before the input.

  let failure = false;

  // Check loop.mp3
  // Find the index of loop.mp3 (checking for suffix)
  const loopMp3ArgIndex = args.findIndex(arg => arg.endsWith('loop.mp3'));
  if (loopMp3ArgIndex === -1) {
    console.error('❌ loop.mp3 not found in args');
    failure = true;
  } else {
    // Check if -stream_loop -1 is before it (and before -ss, -i)
    // The sequence in FFmpegBuilder is: [-stream_loop, -1, -ss, ..., -i, path]
    // So loopMp3ArgIndex is path.
    // -i is at loopMp3ArgIndex - 1
    // -ss value is at loopMp3ArgIndex - 3
    // -ss is at loopMp3ArgIndex - 4
    // -1 is at loopMp3ArgIndex - 5
    // -stream_loop is at loopMp3ArgIndex - 6

    // Let's just search backwards from the input index for -stream_loop
    const streamLoopIndex = args.lastIndexOf('-stream_loop', loopMp3ArgIndex);
    const loopValueIndex = args.lastIndexOf('-1', loopMp3ArgIndex);

    // It should be close.
    if (streamLoopIndex !== -1 && loopValueIndex === streamLoopIndex + 1 && streamLoopIndex > loopMp3ArgIndex - 10) {
      console.log('✅ loop.mp3 has -stream_loop -1');
    } else {
      console.error('❌ loop.mp3 missing -stream_loop -1');
      failure = true;
    }
  }

  // Check once.mp3
  const onceMp3ArgIndex = args.findIndex(arg => arg.endsWith('once.mp3'));
  if (onceMp3ArgIndex === -1) {
    console.error('❌ once.mp3 not found in args');
    failure = true;
  } else {
    // Should NOT have stream_loop before it (closest one should be for another file or -1)
    const streamLoopIndex = args.lastIndexOf('-stream_loop', onceMp3ArgIndex);

    // If we found one, make sure it's not associated with this input.
    // In our case, loop.mp3 is first in DOM, so it comes first in args.
    // once.mp3 is second.
    // If loop.mp3 has stream_loop, streamLoopIndex will point to that.
    // We need to ensure there isn't one *immediately* before once.mp3.

    // The previous input (loop.mp3) args end at loopMp3ArgIndex.
    // So we check between loopMp3ArgIndex and onceMp3ArgIndex.

    let hasLoop = false;
    for (let i = streamLoopIndex; i > -1 && i < onceMp3ArgIndex; i++) {
        if (args[i] === '-stream_loop' && i > loopMp3ArgIndex) {
            hasLoop = true;
            break;
        }
    }

    if (hasLoop) {
      console.error('❌ once.mp3 INCORRECTLY has -stream_loop -1');
      failure = true;
    } else {
      console.log('✅ once.mp3 correctly does not have -stream_loop');
    }
  }

  // Check loop-video.mp4 (video elements scanning)
  const loopVideoArgIndex = args.findIndex(arg => arg.endsWith('loop-video.mp4'));
  if (loopVideoArgIndex !== -1) {
      const streamLoopIndex = args.lastIndexOf('-stream_loop', loopVideoArgIndex);
      const loopValueIndex = args.lastIndexOf('-1', loopVideoArgIndex);

      if (streamLoopIndex !== -1 && loopValueIndex === streamLoopIndex + 1 && streamLoopIndex > onceMp3ArgIndex) {
          console.log('✅ loop-video.mp4 has -stream_loop -1');
      } else {
          console.error('❌ loop-video.mp4 missing -stream_loop -1');
          failure = true;
      }
  } else {
      // It might be skipped if dom scanner treats video tags differently for audio extraction?
      // dom-scanner.ts: if (tagName === 'AUDIO' || tagName === 'VIDEO') ...
      // So it should be there.
      console.error('❌ loop-video.mp4 not found in args');
      failure = true;
  }

  // Check loop-offset.mp3
  const loopOffsetArgIndex = args.findIndex(arg => arg.endsWith('loop-offset.mp3'));
  if (loopOffsetArgIndex !== -1) {
    const streamLoopIndex = args.lastIndexOf('-stream_loop', loopOffsetArgIndex);
    const loopValueIndex = args.lastIndexOf('-1', loopOffsetArgIndex);

    // Ensure -stream_loop -1 is associated with this input (after previous input)
    // We use loopVideoArgIndex as the boundary (or onceMp3ArgIndex if video failed, but let's assume it passed or index is -1)
    const prevIndex = loopVideoArgIndex !== -1 ? loopVideoArgIndex : onceMp3ArgIndex;

    if (streamLoopIndex !== -1 && loopValueIndex === streamLoopIndex + 1 && streamLoopIndex > prevIndex) {
      console.log('✅ loop-offset.mp3 has -stream_loop -1');
    } else {
      console.error('❌ loop-offset.mp3 missing -stream_loop -1');
      failure = true;
    }

    // Check adelay filter
    // We need to look at the -filter_complex argument
    const filterComplexIndex = args.indexOf('-filter_complex');
    if (filterComplexIndex !== -1) {
      const filterComplex = args[filterComplexIndex + 1];
      // Expect adelay=2000|2000
      if (filterComplex.includes('adelay=2000|2000')) {
         console.log('✅ loop-offset.mp3 has adelay=2000|2000');
      } else {
         console.error(`❌ loop-offset.mp3 missing adelay=2000|2000 in filter complex: ${filterComplex}`);
         failure = true;
      }
    } else {
       console.error('❌ -filter_complex not found');
       failure = true;
    }

  } else {
    console.error('❌ loop-offset.mp3 not found in args');
    failure = true;
  }

  await browser.close();

  if (failure) {
    console.error('FAILED');
    process.exit(1);
  } else {
    console.log('PASSED');
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
