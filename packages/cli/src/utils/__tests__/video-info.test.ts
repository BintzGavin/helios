import { describe, it, expect } from 'vitest';
import { parseMediaInfo, parsePixelFormat } from '../video-info.js';

// Stream summaries as `ffmpeg -i` prints them: the bundled FFmpeg 4.1 first, then 6.1.
const TAGGED_41 = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'out.mp4':
  Metadata:
    major_brand     : isom
  Duration: 00:00:12.00, start: 0.000000, bitrate: 1234 kb/s
    Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 1200 kb/s, 30 fps, 30 tbr, 15360 tbn, 60 tbc (default)
    Metadata:
      handler_name    : VideoHandler
    Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s (default)
At least one output file must be specified`;

const UNTAGGED_61 = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'old.mp4':
  Duration: 00:00:01.02, start: 0.000000, bitrate: 177 kb/s
  Stream #0:0[0x1](und): Video: h264 (Constrained Baseline) (avc1 / 0x31637661), yuv420p(progressive), 160x90 [SAR 1:1 DAR 16:9], 92 kb/s, 29.97 fps, 29.97 tbr, 30k tbn (default)
At least one output file must be specified`;

describe('parseMediaInfo', () => {
  it('reads a tagged H.264 + AAC file', () => {
    expect(parseMediaInfo(TAGGED_41)).toEqual({
      duration: 12,
      video: {
        codec: 'h264', width: 1920, height: 1080, fps: 30, pixFmt: 'yuv420p', index: 0,
        color: { matrix: 'bt709', primaries: 'bt709', transfer: 'bt709', range: 'tv' },
      },
      audio: { codec: 'aac', channels: 2, sampleRate: 48000 },
    });
  });

  it('reads an untagged video with no audio', () => {
    const info = parseMediaInfo(UNTAGGED_61);
    expect(info.duration).toBe(1.02);
    expect(info.audio).toBeNull();
    expect(info.video).toMatchObject({ codec: 'h264', width: 160, height: 90, fps: 29.97, pixFmt: 'yuv420p' });
    expect(info.video!.color).toEqual({ matrix: null, primaries: null, transfer: null, range: null });
  });

  it('skips cover art and counts it when picking the video stream', () => {
    const info = parseMediaInfo(`Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'song.m4a':
  Duration: N/A, bitrate: N/A
    Stream #0:0: Video: mjpeg, yuvj420p(pc, bt470bg/unknown/unknown), 600x600 [SAR 1:1 DAR 1:1], 90k tbr, 90k tbn, 90k tbc (attached pic)
    Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, 5.1(side), fltp, 320 kb/s (default)
    Stream #0:2: Video: vp9 (Profile 0), yuv420p(tv, bt709, progressive), 128x64, SAR 1:1 DAR 2:1, 10 fps, 10 tbr, 1k tbn`);
    expect(info.duration).toBeNull();
    expect(info.video).toMatchObject({ codec: 'vp9', index: 1, fps: 10 });
    expect(info.audio).toEqual({ codec: 'aac', channels: 6, sampleRate: 44100 });
  });

  it('falls back to tbr when there is no fps', () => {
    const info = parseMediaInfo(`  Duration: 00:00:02.00, start: 0.000000, bitrate: 1 kb/s
    Stream #0:0: Video: gif, bgra, 128x64, 10 tbr, 100 tbn, 100 tbc`);
    expect(info.video).toMatchObject({ codec: 'gif', pixFmt: 'bgra', fps: 10 });
  });

  it('reads channel counts from layouts', () => {
    const audio = (layout: string) => parseMediaInfo(`    Stream #0:1: Audio: opus, 48000 Hz, ${layout}, fltp`).audio!.channels;
    expect(audio('mono')).toBe(1);
    expect(audio('stereo')).toBe(2);
    expect(audio('7.1')).toBe(8);
    expect(audio('3 channels')).toBe(3);
  });
});

describe('parsePixelFormat', () => {
  it('expands a single shared name into matrix, primaries and transfer', () => {
    expect(parsePixelFormat('yuv420p(tv, bt709, progressive)').color).toEqual({ matrix: 'bt709', primaries: 'bt709', transfer: 'bt709', range: 'tv' });
    expect(parsePixelFormat('yuv420p(tv, smpte170m)').color).toEqual({ matrix: 'smpte170m', primaries: 'smpte170m', transfer: 'smpte170m', range: 'tv' });
    expect(parsePixelFormat('yuv420p(tv, bt470bg)').color).toEqual({ matrix: 'bt470bg', primaries: 'bt470bg', transfer: 'gamma28', range: 'tv' });
  });

  it('reads separate names, with unknown as null', () => {
    expect(parsePixelFormat('yuv420p(tv, bt709/bt709/iec61966-2-1)').color).toEqual({ matrix: 'bt709', primaries: 'bt709', transfer: 'iec61966-2-1', range: 'tv' });
    expect(parsePixelFormat('yuvj420p(pc, bt470bg/unknown/unknown)')).toEqual({
      pixFmt: 'yuvj420p', color: { matrix: 'bt470bg', primaries: null, transfer: null, range: 'pc' },
    });
    expect(parsePixelFormat('yuva444p12le(bt709, progressive)').color).toEqual({ matrix: 'bt709', primaries: 'bt709', transfer: 'bt709', range: null });
  });

  it('reads untagged and RGB formats', () => {
    expect(parsePixelFormat('yuv420p')).toEqual({ pixFmt: 'yuv420p', color: { matrix: null, primaries: null, transfer: null, range: null } });
    expect(parsePixelFormat('yuv420p(top first)').color.matrix).toBeNull();
    expect(parsePixelFormat('rgba(pc, gbr/unknown/unknown, progressive)')).toEqual({
      pixFmt: 'rgba', color: { matrix: 'gbr', primaries: null, transfer: null, range: 'pc' },
    });
  });
});
