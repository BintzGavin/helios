
import { FFmpegBuilder } from '../src/utils/FFmpegBuilder';
import { RendererOptions } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function verifySubtitlesOnly() {
  console.log('Verifying Subtitles Only...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: '/path/to/subs.srt',
    videoCodec: 'libx264'
  };

  const args = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
  const argsStr = args.join(' ');

  // Check filter complex
  assert(argsStr.includes("-filter_complex"), "Should have -filter_complex");
  assert(argsStr.includes("[0:v]subtitles='/path/to/subs.srt'[vout]"), "Should have correct subtitles filter");

  // Check map
  assert(argsStr.includes("-map [vout]"), "Should map [vout]");

  // Ensure no audio map (since no audio)
  assert(!argsStr.includes("-map [aout]"), "Should not map [aout]");
}

function verifySubtitlesAndAudio() {
  console.log('Verifying Subtitles + Audio...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: '/path/to/subs.srt',
    audioFilePath: '/path/to/audio.mp3',
    videoCodec: 'libx264'
  };

  const args = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
  const argsStr = args.join(' ');

  // Check filter complex has both
  assert(argsStr.includes("-filter_complex"), "Should have -filter_complex");
  assert(argsStr.includes("[0:v]subtitles='/path/to/subs.srt'[vout]"), "Should have subtitles filter");
  assert(argsStr.includes("aformat=channel_layouts=stereo"), "Should have audio filter");

  // Check map
  assert(argsStr.includes("-map [vout]"), "Should map [vout]");
  assert(argsStr.includes("-map [a0]"), "Should map [a0] (single track)");
}

function verifySubtitlesAndMixedAudio() {
  console.log('Verifying Subtitles + Mixed Audio...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: '/path/to/subs.srt',
    audioTracks: ['/path/1.mp3', '/path/2.mp3'],
    videoCodec: 'libx264'
  };

  const args = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
  const argsStr = args.join(' ');

  // Check filter complex has both and separation
  assert(argsStr.includes(";"), "Filter complex should use semicolon");
  assert(argsStr.includes("amix="), "Should use amix");

  // Check map
  assert(argsStr.includes("-map [vout]"), "Should map [vout]");
  assert(argsStr.includes("-map [aout]"), "Should map [aout]");
}

function verifyCopyCodecError() {
  console.log('Verifying Copy Codec Error...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: '/path/to/subs.srt',
    videoCodec: 'copy'
  };

  try {
    FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
    throw new Error("Should have thrown error");
  } catch (e: any) {
    assert(e.message.includes("Cannot burn subtitles when videoCodec is 'copy'"), "Error message mismatch");
  }
}

function verifyWindowsPath() {
  console.log('Verifying Windows Path Escaping...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: 'C:\\Users\\Jules\\subs.srt',
    videoCodec: 'libx264'
  };

  const args = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
  const argsStr = args.join(' ');

  // Expected: C\:\\Users\\Jules\\subs.srt -> replace \ with /, : with \:
  // C:/Users/Jules/subs.srt -> Wait, replace /\\/g, '/'
  // Input: C:\Users\Jules\subs.srt
  // Output: C\:/Users/Jules/subs.srt

  // Logic:
  // replace /\\/g, '/' -> C:/Users/Jules/subs.srt
  // replace /:/g, '\\:' -> C\:/Users/Jules/subs.srt

  // In single quotes: 'C\:/Users/Jules/subs.srt'

  const expected = "subtitles='C\\:/Users/Jules/subs.srt'";
  assert(argsStr.includes(expected), `Expected ${expected}, got ${argsStr}`);
}

function verifySpecialChars() {
  console.log('Verifying Special Characters...');
  const options: RendererOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    subtitles: "/path/to/Jules's Subs.srt",
    videoCodec: 'libx264'
  };

  const args = FFmpegBuilder.getArgs(options, 'output.mp4', ['-i', 'input.mp4']);
  const argsStr = args.join(' ');

  // replace ' with \'
  // /path/to/Jules\'s Subs.srt

  const expected = "subtitles='/path/to/Jules\\'s Subs.srt'";
  assert(argsStr.includes(expected), `Expected ${expected} in args`);
}

function main() {
  try {
    verifySubtitlesOnly();
    verifySubtitlesAndAudio();
    verifySubtitlesAndMixedAudio();
    verifyCopyCodecError();
    verifyWindowsPath();
    verifySpecialChars();
    console.log('✅ Verification Passed');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();
