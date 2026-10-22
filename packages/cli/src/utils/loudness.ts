import { spawn } from 'child_process';

/** EBU R128 / ITU-R BS.1770 loudness of an audio stream, as FFmpeg's ebur128 filter measures it. */
export interface Loudness {
  /** Integrated (gated, whole-program) loudness in LUFS. -70 or lower means silence. */
  integrated: number | null;
  /** Loudness range in LU. Not meaningful for clips much shorter than a minute. */
  range: number | null;
  /** True (oversampled) peak in dBTP; null when the audio is digital silence. */
  truePeak: number | null;
}

/** Streaming and social platforms normalize to about this; a mix far from it gets turned up or down. */
export const TARGET_LUFS = -14;
/** Peaks above this can clip once a platform re-encodes the audio. */
export const MAX_TRUE_PEAK = -1;
/** BS.1770's absolute gate: anything quieter is treated as silence. */
export const SILENCE_LUFS = -70;
const TOO_QUIET = -20;
const TOO_LOUD = -9;

const value = (summary: string, label: RegExp): number | null => {
  const match = summary.match(label);
  if (!match) return null;
  if (match[1] === '-inf') return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
};

/** Reads the summary that the ebur128 filter prints at the end of a run (FFmpeg 4.1 and later). */
export function parseLoudness(stderr: string): Loudness | null {
  const at = stderr.lastIndexOf('Summary:');
  if (at < 0) return null;
  const summary = stderr.slice(at);
  const number = '(-?\\d+(?:\\.\\d+)?|-inf)';
  return {
    integrated: value(summary, new RegExp(`\\bI:\\s+${number} LUFS`)),
    range: value(summary, new RegExp(`\\bLRA:\\s+${number} LU\\b`)),
    truePeak: value(summary, new RegExp(`\\bPeak:\\s+${number} dB`)),
  };
}

/** Measures the first audio stream. Rejects if FFmpeg cannot decode it or prints no summary. */
export function measureLoudness(file: string, ffmpegPath: string): Promise<Loudness> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-hide_banner', '-nostdin', '-i', file,
      '-map', '0:a:0', '-vn', '-sn', '-dn',
      '-af', 'ebur128=peak=true', '-f', 'null', '-',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      // The filter logs a line every 100 ms; only the summary at the end matters.
      stderr = (stderr + chunk.toString()).slice(-16384);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const loudness = code === 0 ? parseLoudness(stderr) : null;
      if (loudness) resolve(loudness);
      else reject(new Error(`FFmpeg could not measure the audio's loudness: ${stderr.trim().split('\n').pop() || `exit code ${code}`}`));
    });
  });
}

/** Plain-language warnings for a measured mix; none means it is ready to publish. */
export function loudnessWarnings(loudness: Loudness): string[] {
  const warnings: string[] = [];
  const { integrated, truePeak } = loudness;
  if (integrated === null || integrated <= SILENCE_LUFS) {
    warnings.push('The audio track is silent. Check that the music or voice files load and that no track is muted.');
    return warnings;
  }
  if (truePeak !== null && truePeak > MAX_TRUE_PEAK) {
    warnings.push(
      `The audio peaks at ${truePeak.toFixed(1)} dBTP, above ${MAX_TRUE_PEAK} dBTP: it can clip and distort when platforms re-encode it. ` +
      `Lower the loudest track by at least ${(truePeak - MAX_TRUE_PEAK).toFixed(1)} dB.`,
    );
  }
  if (integrated < TOO_QUIET) {
    warnings.push(
      `The audio is quiet: ${integrated.toFixed(1)} LUFS, where platforms play around ${TARGET_LUFS} LUFS. ` +
      'It will sound weak next to other videos. Raise the music or voice volume (mixing several tracks also lowers each one).',
    );
  } else if (integrated > TOO_LOUD) {
    warnings.push(
      `The audio is loud: ${integrated.toFixed(1)} LUFS, where platforms play around ${TARGET_LUFS} LUFS. ` +
      'They will turn it down, and a mix this loud is usually squashed. Lower the volume.',
    );
  }
  return warnings;
}
