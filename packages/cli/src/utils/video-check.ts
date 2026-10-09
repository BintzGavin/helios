import { readMediaInfo, type AudioStreamInfo, type ColorTags } from './video-info.js';
import { analyzeVideo, summarizeFlashes, MAX_FLASHES_PER_SECOND, type FlashResult, type FlashWindow } from './flash.js';

export interface CheckReport {
  ok: boolean;
  file: string;
  video: {
    codec: string;
    width: number;
    height: number;
    fps: number;
    /** The file's duration in seconds, as the container reports it. */
    duration: number | null;
    /** Frames actually decoded. */
    frames: number;
    pixFmt: string | null;
    color: ColorTags;
  };
  audio: AudioStreamInfo | null;
  flash: FlashResult;
  problems: string[];
  warnings: string[];
}

export const UNTAGGED_WARNING = 'The video has no color tags: players may show it washed out. Re-render with this Helios version.';

/** AAC and Opus pad their last packet, so audio may run this long past the last frame. */
const AUDIO_PADDING = 0.05;

const YCBCR = /^(yuv|nv\d|p\d{3})/;

const seconds = (t: number) => `${t.toFixed(2)} s`;

/** Reads a rendered video and checks its streams, length and flashing. */
export async function checkVideo(file: string, ffmpegPath: string): Promise<CheckReport> {
  const info = await readMediaInfo(file, ffmpegPath);
  const stream = info.video;
  if (!stream) {
    throw new Error(`${file} has no video stream`);
  }
  if (!stream.fps || !stream.width || !stream.height) {
    throw new Error(`could not read the frame rate and size of ${file}'s video`);
  }

  const { frames, flashes } = await analyzeVideo(file, ffmpegPath, { ...stream, fps: stream.fps });
  const flash = summarizeFlashes(flashes);
  const problems: string[] = [];
  const warnings: string[] = [];

  const span = (w: FlashWindow) => `${w.count} times in one second (${seconds(w.t0)} to ${seconds(w.t1)})`;
  const limit = `more than the ${MAX_FLASHES_PER_SECOND} that WCAG 2.3.1 allows: it can trigger seizures`;
  if (flashes.general.maxPerSecond > MAX_FLASHES_PER_SECOND && flashes.general.worst) {
    problems.push(`The video flashes ${span(flashes.general.worst)}, ${limit}. ` +
      `Flash at most ${MAX_FLASHES_PER_SECOND} times a second, or make the flashing smaller or lower in contrast.`);
  }
  if (flashes.red.maxPerSecond > MAX_FLASHES_PER_SECOND && flashes.red.worst) {
    problems.push(`Saturated red flashes ${span(flashes.red.worst)}, ${limit}. ` +
      `Flash red at most ${MAX_FLASHES_PER_SECOND} times a second, or use a less saturated red.`);
  }

  if (stream.pixFmt && YCBCR.test(stream.pixFmt) && !stream.color.matrix) {
    warnings.push(UNTAGGED_WARNING);
  }

  if (info.duration !== null && frames > 0) {
    const pictureLength = frames / stream.fps;
    // Durations print to 1/100 s; a frame count is exact to half a frame.
    const slack = 0.5 / stream.fps + 0.005;
    const longer = info.duration - pictureLength > slack + (info.audio ? AUDIO_PADDING : 0);
    const shorter = pictureLength - info.duration > slack;
    if (longer || shorter) {
      const expected = Math.round(info.duration * stream.fps);
      warnings.push(
        `The file lasts ${seconds(info.duration)}, which at ${stream.fps} fps is ${expected} frames, but its video has ${frames} ` +
        `(${seconds(pictureLength)}): frames were dropped or repeated, or ${longer ? 'another stream runs past the picture' : 'the duration is wrong'}.`,
      );
    }
  }

  return {
    ok: problems.length === 0,
    file,
    video: {
      codec: stream.codec,
      width: stream.width,
      height: stream.height,
      fps: stream.fps,
      duration: info.duration,
      frames,
      pixFmt: stream.pixFmt,
      color: stream.color,
    },
    audio: info.audio,
    flash,
    problems,
    warnings,
  };
}

/** The human report: one line per check, then any problems and warnings in full. */
export function formatCheckReport(report: CheckReport): string {
  const { video, audio, flash } = report;
  const color = video.color;
  const lines: string[] = [];
  const line = (state: 'ok' | 'warn' | 'fail', label: string, text: string) =>
    lines.push(`${state === 'ok' ? '✓' : state === 'warn' ? '!' : '✗'} ${label}: ${text}`);

  line('ok', 'Video', `${video.codec}, ${video.width}x${video.height}, ${video.fps} fps, ${video.pixFmt ?? 'unknown pixel format'}`);
  const untagged = report.warnings.includes(UNTAGGED_WARNING);
  const tags = [color.matrix && `matrix ${color.matrix}`, color.primaries && `primaries ${color.primaries}`, color.transfer && `transfer ${color.transfer}`, color.range && `${color.range} range`].filter(Boolean);
  line(untagged ? 'warn' : 'ok', 'Color', tags.length ? tags.join(', ') : untagged ? 'untagged' : 'not Y\'CbCr, no tags needed');
  const lengthWarning = report.warnings.find((w) => w.startsWith('The file lasts'));
  line(lengthWarning ? 'warn' : 'ok', 'Length', `${video.frames} frames${video.duration !== null ? `, ${seconds(video.duration)}` : ''}`);
  line('ok', 'Audio', audio ? `${audio.codec}${audio.channels ? `, ${audio.channels} channel${audio.channels === 1 ? '' : 's'}` : ''}${audio.sampleRate ? `, ${audio.sampleRate} Hz` : ''}` : 'none');
  const flashText = flash.worst
    ? `at most ${flash.maxPerSecond} in one second (${seconds(flash.worst.t0)} to ${seconds(flash.worst.t1)}); WCAG 2.3.1 allows ${MAX_FLASHES_PER_SECOND}`
    : `none; WCAG 2.3.1 allows ${MAX_FLASHES_PER_SECOND} a second`;
  line(flash.ok ? 'ok' : 'fail', 'Flashes', flashText);

  for (const problem of report.problems) lines.push(`\nProblem: ${problem}`);
  for (const warning of report.warnings) lines.push(`\nWarning: ${warning}`);
  lines.push(`\n${report.ok ? 'OK' : 'FAILED'}: ${report.file}`);
  return lines.join('\n');
}
