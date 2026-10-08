import { spawn } from 'child_process';
import fs from 'fs';

export interface ColorTags {
  /** Y'CbCr matrix (FFmpeg's colorspace), e.g. bt709. null when the stream doesn't say. */
  matrix: string | null;
  primaries: string | null;
  transfer: string | null;
  /** tv (limited) or pc (full). */
  range: string | null;
}

export interface VideoStreamInfo {
  codec: string;
  width: number;
  height: number;
  fps: number | null;
  pixFmt: string | null;
  color: ColorTags;
  /** Which video stream this is (for `-map 0:v:N`), skipping none. */
  index: number;
}

export interface AudioStreamInfo {
  codec: string;
  channels: number | null;
  sampleRate: number | null;
}

export interface MediaInfo {
  /** The container's duration in seconds, or null when FFmpeg reports N/A. */
  duration: number | null;
  video: VideoStreamInfo | null;
  audio: AudioStreamInfo | null;
}

// FFmpeg prints one name when the matrix, primaries and transfer share a number
// (e.g. all 1: "bt709"). These give the primaries and transfer names for that number.
const SPACE_NUMBER: Record<string, number> = {
  bt709: 1, fcc: 4, bt470bg: 5, smpte170m: 6, smpte240m: 7, bt2020nc: 9, bt2020c: 10,
};
const PRIMARIES_BY_NUMBER: Record<number, string> = {
  1: 'bt709', 4: 'bt470m', 5: 'bt470bg', 6: 'smpte170m', 7: 'smpte240m', 9: 'bt2020', 10: 'smpte428',
};
const TRANSFER_BY_NUMBER: Record<number, string> = {
  1: 'bt709', 4: 'gamma22', 5: 'gamma28', 6: 'smpte170m', 7: 'smpte240m', 9: 'log100', 10: 'log316',
};
const FIELD_ORDERS = ['progressive', 'top first', 'bottom first', 'top coded first (swapped)', 'bottom coded first (swapped)'];
const CHANNEL_LAYOUTS: Record<string, number> = { mono: 1, stereo: 2, downmix: 2, quad: 4, hexagonal: 6, octagonal: 8 };

/** Splits on commas that are not inside parentheses or brackets. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

const unknown = (name: string | undefined): string | null =>
  !name || name === 'unknown' || name === 'unspecified' || name === 'reserved' ? null : name;

/** Parses "yuv420p(tv, bt709, progressive)" and its variants. */
export function parsePixelFormat(part: string): { pixFmt: string | null; color: ColorTags } {
  const color: ColorTags = { matrix: null, primaries: null, transfer: null, range: null };
  const match = part.match(/^([0-9a-z_]+)(?:\((.*)\))?$/);
  if (!match) return { pixFmt: null, color };
  for (const item of (match[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (item === 'tv' || item === 'pc') {
      color.range = item;
    } else if (item.includes('/')) {
      const [matrix, primaries, transfer] = item.split('/');
      color.matrix = unknown(matrix);
      color.primaries = unknown(primaries);
      color.transfer = unknown(transfer);
    } else if (!FIELD_ORDERS.includes(item) && unknown(item)) {
      const number = SPACE_NUMBER[item];
      color.matrix = item;
      color.primaries = number ? PRIMARIES_BY_NUMBER[number] ?? null : item;
      color.transfer = number ? TRANSFER_BY_NUMBER[number] ?? null : item;
    }
  }
  return { pixFmt: match[1] === 'none' ? null : match[1], color };
}

function parseChannels(layout: string | undefined): number | null {
  if (!layout) return null;
  const count = layout.match(/^(\d+) channels/);
  if (count) return Number(count[1]);
  const numbered = layout.match(/^(\d+)\.(\d+)/);
  if (numbered) return Number(numbered[1]) + Number(numbered[2]);
  return CHANNEL_LAYOUTS[layout.replace(/\(.*\)$/, '')] ?? null;
}

/** Reads the stream summary FFmpeg prints for `ffmpeg -i <file>`. */
export function parseMediaInfo(stderr: string): MediaInfo {
  const info: MediaInfo = { duration: null, video: null, audio: null };

  const duration = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (duration) {
    info.duration = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
  }

  let videoIndex = 0;
  for (const line of stderr.split('\n')) {
    const stream = line.match(/^\s*Stream #\d+:\d+.*?: (Video|Audio): (.*)$/);
    if (!stream) continue;
    const parts = splitTopLevel(stream[2]);
    const codec = parts[0].split(' ')[0];

    if (stream[1] === 'Video') {
      const index = videoIndex++;
      // Cover art in an audio file is a still, not the video.
      if (info.video || /\(attached pic\)/.test(stream[2])) continue;
      const size = parts.map((p) => p.match(/^(\d+)x(\d+)/)).find(Boolean);
      const rate = (unit: string) => {
        const found = parts.map((p) => p.match(new RegExp(`^(\\d+(?:\\.\\d+)?)(k?) ${unit}\\b`))).find(Boolean);
        return found ? Number(found[1]) * (found[2] ? 1000 : 1) : null;
      };
      info.video = {
        codec,
        width: size ? Number(size[1]) : 0,
        height: size ? Number(size[2]) : 0,
        fps: rate('fps') ?? rate('tbr'),
        ...parsePixelFormat(parts[1] ?? ''),
        index,
      };
    } else if (!info.audio) {
      const sampleRate = stream[2].match(/(\d+) Hz/);
      const hzAt = parts.findIndex((p) => / Hz$/.test(p));
      info.audio = {
        codec,
        channels: parseChannels(hzAt >= 0 ? parts[hzAt + 1] : undefined),
        sampleRate: sampleRate ? Number(sampleRate[1]) : null,
      };
    }
  }
  return info;
}

/** Runs `ffmpeg -i` on a file and parses what it prints. Throws when FFmpeg can't read it. */
export async function readMediaInfo(file: string, ffmpegPath: string): Promise<MediaInfo> {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} does not exist`);
  }
  const stderr = await new Promise<string>((resolve, reject) => {
    // With no output file FFmpeg prints the input's streams and exits 1; that is expected.
    const child = spawn(ffmpegPath, ['-hide_banner', '-nostdin', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    let text = '';
    child.stderr.on('data', (chunk) => { text += chunk.toString(); });
    child.on('error', reject);
    child.on('close', () => resolve(text));
  });
  if (!/^Input #0/m.test(stderr)) {
    const reason = stderr.trim().split('\n').pop()?.replace(/^.*?: /, '') || 'FFmpeg could not open it';
    throw new Error(`${file} is not a media file FFmpeg can read (${reason})`);
  }
  return parseMediaInfo(stderr);
}
