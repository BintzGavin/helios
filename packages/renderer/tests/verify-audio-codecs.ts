import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

function runTests() {
  console.log('Running Audio Codec Verification...');
  let hasError = false;

  const baseOptions: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 1,
    audioFilePath: 'audio.mp3', // Trigger audio logic
    mode: 'canvas',
  };

  const dummyInputArgs = ['-f', 'image2pipe', '-i', '-'];
  const outputPath = 'output.mp4';

  // Test 1: Default (AAC)
  console.log('\nTest 1: Default Audio Codec');
  const args1 = FFmpegBuilder.getArgs(baseOptions, outputPath, dummyInputArgs).args;
  if (!args1.includes('aac')) {
     console.error('❌ Failed: Expected default audio codec to be aac');
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 2: Explicit Audio Codec
  console.log('\nTest 2: Explicit Audio Codec (libopus)');
  const options2 = { ...baseOptions, audioCodec: 'libopus' };
  const args2 = FFmpegBuilder.getArgs(options2, outputPath, dummyInputArgs).args;
  if (!args2.includes('libopus')) {
     console.error('❌ Failed: Expected audio codec to be libopus');
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 3: WebM Default (libvorbis)
  console.log('\nTest 3: WebM Default (libvpx implies libvorbis)');
  const options3 = { ...baseOptions, videoCodec: 'libvpx-vp9' };
  const args3 = FFmpegBuilder.getArgs(options3, 'output.webm', dummyInputArgs).args;
  if (!args3.includes('libvorbis')) {
     console.error('❌ Failed: Expected audio codec to be libvorbis when video is libvpx');
     hasError = true;
  } else {
     console.log('✅ Passed');
  }

  // Test 4: Audio Bitrate
  console.log('\nTest 4: Audio Bitrate');
  const options4 = { ...baseOptions, audioBitrate: '192k' };
  const args4 = FFmpegBuilder.getArgs(options4, outputPath, dummyInputArgs).args;
  if (!args4.includes('-b:a') || !args4.includes('192k')) {
     console.error('❌ Failed: Expected -b:a 192k');
     hasError = true;
  } else {
     console.log('✅ Passed');
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
