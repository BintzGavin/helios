import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import {
  analyzeAudioFile,
  DEFAULT_BEATS_PER_BAR,
  DEFAULT_FPS,
  DEFAULT_TEMPO_RANGE,
  formatBeatMap,
  type BeatMap,
} from '../utils/audio/beatmap.js';

/** "120:180" → [120, 180] */
export function parseTempoRange(value: string): [number, number] {
  const match = /^\s*(\d+(?:\.\d+)?)\s*[:\-–]\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!match) throw new Error(`--tempo-range takes min:max in BPM, e.g. 90:180 (got "${value}")`);
  return [Number(match[1]), Number(match[2])];
}

/** song.mp3 → song.beats.json, next to the audio. */
export function defaultOutputPath(audio: string): string {
  const parsed = path.parse(audio);
  return path.join(parsed.dir, `${parsed.name}.beats.json`);
}

export function summarize(file: string, map: BeatMap): string {
  const bpms = map.tempo.map((p) => p.bpm);
  const lo = Math.min(...bpms, map.bpm);
  const hi = Math.max(...bpms, map.bpm);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return (
    `Wrote ${file}: ${map.bpm.toFixed(1)} BPM (${lo.toFixed(1)}–${hi.toFixed(1)}), ` +
    `${plural(map.beats.length, 'beat')}, ${plural(map.downbeats.length, 'bar')}, ` +
    `${plural(map.hits.length, 'hit')}, ${plural(map.sections.length, 'section')}`
  );
}

function number(value: string, flag: string, integer = false): number {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) {
    throw new Error(`${flag} must be a positive ${integer ? 'whole number' : 'number'} (got "${value}")`);
  }
  return n;
}

export function registerAnalyzeCommand(program: Command) {
  program
    .command('analyze <audio>')
    .description(
      'Analyze a song into a beat map to sync a video to: beats on a drifting tempo, bars, hits, ' +
        'risers, sections, drum onsets and loudness envelopes (JSON)',
    )
    .option('-o, --output <path>', 'Output JSON file (default: <audio name>.beats.json next to the audio)')
    .option('--fps <n>', 'Frames per second of the loudness envelopes', String(DEFAULT_FPS))
    .option(
      '--tempo-range <min:max>',
      'BPM range to search; narrow it if the beats come out at half or double time',
      DEFAULT_TEMPO_RANGE.join(':'),
    )
    .option('--beats-per-bar <n>', 'Beats in a bar', String(DEFAULT_BEATS_PER_BAR))
    .action(async (audio: string, options) => {
      try {
        const input = path.resolve(process.cwd(), audio);
        const map = await analyzeAudioFile(input, {
          fps: number(options.fps, '--fps'),
          tempoRange: parseTempoRange(options.tempoRange),
          beatsPerBar: number(options.beatsPerBar, '--beats-per-bar', true),
        });
        const output = path.resolve(process.cwd(), options.output ?? defaultOutputPath(audio));
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, formatBeatMap(map));
        const shown = path.relative(process.cwd(), output);
        console.log(summarize(shown.startsWith('..') || path.isAbsolute(shown) ? output : shown, map));
      } catch (err: any) {
        console.error(`Analyze failed: ${err.message}`);
        process.exit(1);
      }
    });
}
