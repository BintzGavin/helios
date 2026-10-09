import { FFmpegBuilder } from '../src/utils/FFmpegBuilder.js';
import { RendererOptions } from '../src/types.js';
import assert from 'assert';

console.log('Verifying BT.709 conversion and colour tags...');

const baseOptions: RendererOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 2,
  mode: 'dom',
};
const videoInputArgs = ['-f', 'mjpeg', '-framerate', '30', '-i', '-'];

const SCALE = 'scale=out_color_matrix=bt709:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int+full_chroma_inp';
const SETPARAMS = 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';
const TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

function build(options: Partial<RendererOptions>, output = 'out.mp4') {
  return FFmpegBuilder.getArgs({ ...baseOptions, ...options }, output, videoInputArgs).args;
}

function valueOf(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function maps(args: string[]): string[] {
  return args.flatMap((arg, i) => (arg === '-map' ? [args[i + 1]] : []));
}

function assertTagged(args: string[], pixelFormat: string, label: string) {
  assert.strictEqual(
    valueOf(args, '-filter_complex'),
    `[0:v]${SCALE},format=${pixelFormat},${SETPARAMS}[vout]`,
    `${label}: should convert to BT.709 and tag the frames`,
  );
  assert.deepStrictEqual(maps(args)[0], '[vout]', `${label}: should map the converted video`);
  const at = args.indexOf('-colorspace');
  assert.deepStrictEqual(args.slice(at, at + TAGS.length), TAGS, `${label}: should tag the stream BT.709, limited range`);
  assert.strictEqual(valueOf(args, '-pix_fmt'), pixelFormat, `${label}: keeps the pixel format`);
  assert.strictEqual(valueOf(args, '-movflags'), '+faststart+write_colr', `${label}: should write the colr atom`);
}

function assertUntagged(args: string[], label: string) {
  const filter = valueOf(args, '-filter_complex') ?? '';
  assert.ok(!filter.includes('out_color_matrix'), `${label}: should not convert to BT.709`);
  assert.ok(!filter.includes('setparams'), `${label}: should not tag frames`);
  for (const flag of ['-colorspace', '-color_primaries', '-color_trc', '-color_range']) {
    assert.ok(!args.includes(flag), `${label}: should not pass ${flag}`);
  }
}

// Test 1: the default H.264 render
{
  const args = build({});
  assertTagged(args, 'yuv420p', 'libx264 default');
  // The exact default arguments, so a change to them is deliberate.
  assert.deepStrictEqual(args, [
    '-y', ...videoInputArgs,
    '-filter_complex', `[0:v]${SCALE},format=yuv420p,${SETPARAMS}[vout]`,
    '-map', '[vout]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', ...TAGS, '-movflags', '+faststart+write_colr',
    '-preset', 'ultrafast',
    'out.mp4',
  ]);
  console.log('✅ libx264 default');
}

// Test 2: every Y'CbCr video encoder is converted and tagged
{
  const cases: [string, string | undefined, string][] = [
    ['libx265', undefined, 'yuv420p'],
    ['libvpx', undefined, 'yuv420p'],
    ['libvpx-vp9', undefined, 'yuv420p'],
    ['libvpx-vp9', 'yuva420p', 'yuva420p'], // transparent WebM keeps its alpha plane
    ['libaom-av1', undefined, 'yuv420p'],
    ['libsvtav1', 'yuv420p10le', 'yuv420p10le'],
    ['h264_nvenc', 'nv12', 'nv12'],
    ['hevc_videotoolbox', 'p010le', 'p010le'],
    ['h264_qsv', undefined, 'yuv420p'],
    ['prores_ks', 'yuv422p10le', 'yuv422p10le'],
    ['prores_ks', 'yuva444p10le', 'yuva444p10le'],
  ];
  for (const [videoCodec, pixelFormat, expected] of cases) {
    assertTagged(build({ videoCodec, pixelFormat }, 'out.mkv'), expected, `${videoCodec} ${expected}`);
  }
  console.log('✅ H.265, VP8/VP9/AV1, hardware encoders and ProRes are tagged');
}

// Test 3: RGB, palette and still-image outputs are left alone
{
  const cases: [string, string | undefined][] = [
    ['gif', undefined], // the default pixel format is yuv420p, but GIF stores a palette
    ['gif', 'rgb8'],
    ['png', 'rgba'],
    ['apng', 'rgba'],
    ['qtrle', 'argb'],
    ['libx264rgb', 'rgb24'],
    ['mjpeg', 'yuvj420p'],
    ['libwebp', 'yuva420p'],
    ['libx264', 'rgba'],
    ['libx264', 'gray'],
    ['libx264', 'yuvj420p'],
  ];
  for (const [videoCodec, pixelFormat] of cases) {
    const args = build({ videoCodec, pixelFormat }, 'out.mov');
    assertUntagged(args, `${videoCodec} ${pixelFormat ?? 'default'}`);
    assert.strictEqual(valueOf(args, '-movflags'), '+faststart');
    assert.deepStrictEqual(maps(args), ['0:v']);
  }
  console.log('✅ GIF, PNG, RGB and JPEG-range outputs are not tagged');
}

// Test 4: stream copy cannot convert, so it must not claim tags it did not write
{
  const args = build({ videoCodec: 'copy' });
  assertUntagged(args, 'copy');
  assert.deepStrictEqual(maps(args), ['0:v']);
  assert.strictEqual(valueOf(args, '-movflags'), '+faststart');
  console.log('✅ Stream copy is untouched');
}

// Test 5: the conversion shares -filter_complex with audio and subtitles
{
  const args = build({ audioFilePath: 'song.mp3', subtitles: 'subs.srt' });
  const graph = valueOf(args, '-filter_complex')!;
  const [video, audio] = graph.split(';');
  assert.strictEqual(video, `[0:v]subtitles='subs.srt',${SCALE},format=yuv420p,${SETPARAMS}[vout]`);
  assert.ok(audio.startsWith('[1:a]aformat=channel_layouts=stereo'), 'audio chain follows the video chain');
  assert.deepStrictEqual(maps(args), ['[vout]', '[a0]']);
  assert.strictEqual(args.filter(a => a === '-filter_complex').length, 1, 'one filter graph');

  const audioOnly = build({ audioFilePath: 'song.mp3' });
  assert.ok(valueOf(audioOnly, '-filter_complex')!.startsWith(`[0:v]${SCALE},format=yuv420p,${SETPARAMS}[vout];[1:a]`));
  assert.deepStrictEqual(maps(audioOnly), ['[vout]', '[a0]']);
  console.log('✅ Composes with subtitles and audio filters');
}

console.log('All colour tag tests passed!');
