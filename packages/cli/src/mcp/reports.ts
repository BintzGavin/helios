import path from 'path';
import { stripAnsi } from './cli-runner.js';

/**
 * Reads what `helios analyze`, `helios check --json` and `helios verify --json` write, and turns
 * it into the short text and structured content the MCP tools return. Every field is checked
 * and copied, never passed through: a structuredContent that doesn't match the tool's
 * outputSchema fails the whole call, and these files come from another process and version.
 */

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function round(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Seconds as a short number: 9.64, 12.5, 3. */
function secs(n: number): string {
  return String(round(n, 2));
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
}

/** A time list: numbers, or objects with a `t`. */
function times(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => num(item) ?? (isObject(item) ? num(item.t) : undefined)).filter((t): t is number => t !== undefined);
}

/** The JSON object a `--json` command printed: all of stdout, or else the part from the line that starts it. */
export function parseJsonObject(stdout: string): Json | undefined {
  const text = stripAnsi(stdout).trim();
  const attempt = (source: string) => {
    try {
      const value = JSON.parse(source);
      return isObject(value) ? value : undefined;
    } catch {
      return undefined;
    }
  };
  if (!text) return undefined;
  const whole = attempt(text);
  if (whole) return whole;
  // Something logged to stdout before the JSON.
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].startsWith('{')) continue;
    const found = attempt(lines.slice(i).join('\n'));
    if (found) return found;
  }
  return undefined;
}

// ---- helios analyze ------------------------------------------------------------------------

/** How many of the strongest hits a summary lists. */
export const TOP_HITS = 8;
const MAX_SECTIONS = 64;
const TEXT_SECTIONS = 12;

export interface BeatsSummary {
  [key: string]: unknown;
  /** The audio, relative to the project root. */
  audio: string;
  /** The beats file, relative to the project root. */
  path: string;
  absolutePath: string;
  duration: number | null;
  bpm: number;
  tempoRange: { min: number; max: number };
  beats: number;
  bars: number;
  beatsPerBar: number;
  firstDownbeat: number | null;
  /** How the downbeats were placed: "kick" or "harmony". */
  downbeatMethod?: string;
  sections: Array<{ t0: number; t1: number; energy?: number }>;
  /** The strongest hits, in time order. */
  hits: Array<{ t: number; score: number }>;
}

export function summarizeBeats(data: unknown, where: { audio: string; path: string; absolutePath: string }): BeatsSummary {
  if (!isObject(data) || num(data.bpm) === undefined || !Array.isArray(data.beats)) {
    throw new Error(`${where.path} is not a Helios beats file (it has no bpm or beats)`);
  }
  const bpm = num(data.bpm)!;
  const tempos = Array.isArray(data.tempo)
    ? data.tempo.map((point) => (isObject(point) ? num(point.bpm) : undefined)).filter((b): b is number => b !== undefined)
    : [];
  const downbeats = times(data.downbeats);
  const sections = (Array.isArray(data.sections) ? data.sections : [])
    .filter(isObject)
    .filter((s) => num(s.t0) !== undefined && num(s.t1) !== undefined)
    .slice(0, MAX_SECTIONS)
    .map((s) => {
      const section: { t0: number; t1: number; energy?: number } = { t0: round(num(s.t0)!, 3), t1: round(num(s.t1)!, 3) };
      if (num(s.energy) !== undefined) section.energy = round(num(s.energy)!, 2);
      return section;
    });
  const hits = (Array.isArray(data.hits) ? data.hits : [])
    .filter(isObject)
    .filter((h) => num(h.t) !== undefined)
    .map((h) => ({ t: round(num(h.t)!, 3), score: round(num(h.score) ?? 0, 2) }))
    .sort((a, b) => b.score - a.score || a.t - b.t)
    .slice(0, TOP_HITS)
    .sort((a, b) => a.t - b.t);

  const summary: BeatsSummary = {
    audio: where.audio,
    path: where.path,
    absolutePath: where.absolutePath,
    duration: num(data.duration) !== undefined ? round(num(data.duration)!, 3) : null,
    bpm: round(bpm, 1),
    tempoRange: {
      min: round(tempos.length ? Math.min(...tempos) : bpm, 1),
      max: round(tempos.length ? Math.max(...tempos) : bpm, 1),
    },
    beats: data.beats.length,
    bars: downbeats.length,
    beatsPerBar: num(data.beatsPerBar) ?? 4,
    firstDownbeat: downbeats.length ? round(downbeats[0], 3) : null,
    sections,
    hits,
  };
  if (typeof data.downbeatMethod === 'string' && data.downbeatMethod) summary.downbeatMethod = data.downbeatMethod;
  return summary;
}

export function beatsText(summary: BeatsSummary): string {
  const lines: string[] = [];
  const length = summary.duration !== null ? ` (${secs(summary.duration)} s)` : '';
  lines.push(`Analyzed ${summary.audio}${length} and wrote ${summary.path}.`);

  const { min, max } = summary.tempoRange;
  lines.push(min === max
    ? `Tempo: ${summary.bpm} BPM.`
    : `Tempo: ${summary.bpm} BPM, drifting ${min}–${max}: time things from the beats array, not a fixed grid.`);

  const how = summary.downbeatMethod ? ` (chosen by the ${summary.downbeatMethod} vote)` : '';
  lines.push(summary.firstDownbeat !== null
    ? `${summary.beats} beats in ${summary.bars} bars of ${summary.beatsPerBar}; the first downbeat is at ${secs(summary.firstDownbeat)} s${how}.`
    : `${summary.beats} beats; no downbeats were found.`);

  if (summary.sections.length) {
    const shown = summary.sections.slice(0, TEXT_SECTIONS)
      .map((s) => `${secs(s.t0)}–${secs(s.t1)}${s.energy !== undefined ? ` (${s.energy})` : ''}`);
    const more = summary.sections.length > TEXT_SECTIONS ? `, and ${summary.sections.length - TEXT_SECTIONS} more` : '';
    lines.push(`Sections, in seconds (energy 0–1): ${shown.join(', ')}${more}.`);
  }
  if (summary.hits.length) {
    lines.push(`Strongest hits, in seconds (score): ${summary.hits.map((h) => `${secs(h.t)} (${h.score})`).join(', ')}.`);
  }
  lines.push(
    `In the page, load it with fetch() by its path relative to the page, e.g. fetch('${path.posix.basename(summary.path)}') from a page in the same folder. ` +
    'Every time in it is in seconds of song time; bar k starts at downbeats[k].',
  );
  return lines.join('\n');
}

// ---- helios check --------------------------------------------------------------------------

export interface RenderChecks {
  [key: string]: unknown;
  /** passed or failed: helios check ran; error: it couldn't; running: it hasn't finished yet. */
  status: 'passed' | 'failed' | 'error' | 'running';
  /** The one line a render result adds to its text. */
  message: string;
  problems: string[];
  warnings: string[];
  flash?: { ok: boolean; maxPerSecond?: number; worst: { t0: number; t1: number; count: number } | null };
}

/** "bt709" → "BT.709"; other tags are shown as written. */
function colorName(tag: string): string {
  const bt = /^bt(\d+)/i.exec(tag);
  return bt ? `BT.${bt[1]}` : tag;
}

export function summarizeCheck(data: Json): RenderChecks {
  const problems = strings(data.problems);
  const warnings = strings(data.warnings);
  const ok = typeof data.ok === 'boolean' ? data.ok : problems.length === 0;

  let flash: RenderChecks['flash'];
  if (isObject(data.flash)) {
    const worst = isObject(data.flash.worst) && num(data.flash.worst.t0) !== undefined && num(data.flash.worst.t1) !== undefined
      ? { t0: num(data.flash.worst.t0)!, t1: num(data.flash.worst.t1)!, count: num(data.flash.worst.count) ?? 0 }
      : null;
    flash = { ok: data.flash.ok !== false, worst };
    if (num(data.flash.maxPerSecond) !== undefined) flash.maxPerSecond = num(data.flash.maxPerSecond);
  }

  let message: string;
  if (!ok) {
    message = `Checks: ${[...(problems.length ? problems : ['helios check reported a problem without saying which.']), ...warnings].join(' ')}`;
  } else {
    const passed: string[] = [];
    if (flash?.ok) passed.push('no flashing above WCAG 2.3.1');
    const color = isObject(data.video) && isObject(data.video.color) ? data.video.color : undefined;
    const tag = color && [color.matrix, color.primaries, color.transfer].find((v): v is string => typeof v === 'string' && v !== '');
    if (tag) passed.push(`colour tagged ${colorName(tag)}`);
    message = `Checks: ${passed.length ? passed.join('; ') : 'passed'}.${warnings.length ? ` ${warnings.join(' ')}` : ''}`;
  }

  const checks: RenderChecks = { status: ok ? 'passed' : 'failed', message, problems, warnings };
  if (flash) checks.flash = flash;
  return checks;
}

// ---- helios verify --json ------------------------------------------------------------------

const MAX_MISSING = 50;
const TEXT_MISSING = 5;

export interface VerifyReport {
  [key: string]: unknown;
  ok: boolean;
  message: string;
  purity?: { ok: boolean; message: string; samples?: number; differing: number[] };
  cues?: {
    ok: boolean;
    message: string;
    total: number;
    shown: number;
    missing: Array<{ text: string; start: number; end: number; seen?: string }>;
  };
}

export function summarizeVerify(data: Json): VerifyReport {
  let purity: VerifyReport['purity'];
  if (isObject(data.purity)) {
    const ok = data.purity.ok !== false;
    purity = {
      ok,
      message: typeof data.purity.message === 'string' && data.purity.message
        ? data.purity.message
        : ok ? 'The sampled frames depend only on t.' : 'Some frames depend on what was rendered before them.',
      differing: times(data.purity.differing),
    };
    if (num(data.purity.samples) !== undefined) purity.samples = num(data.purity.samples);
  }

  let cues: VerifyReport['cues'];
  if (isObject(data.cues)) {
    const missing = (Array.isArray(data.cues.missing) ? data.cues.missing : [])
      .filter(isObject)
      .slice(0, MAX_MISSING)
      .map((cue) => {
        const entry: { text: string; start: number; end: number; seen?: string } = {
          text: typeof cue.text === 'string' ? cue.text : '',
          start: num(cue.start) ?? 0,
          end: num(cue.end) ?? 0,
        };
        if (typeof cue.seen === 'string') entry.seen = cue.seen;
        return entry;
      });
    const total = num(data.cues.total) ?? 0;
    const shown = num(data.cues.shown) ?? 0;
    const ok = typeof data.cues.ok === 'boolean' ? data.cues.ok : missing.length === 0;
    cues = {
      ok,
      message: typeof data.cues.message === 'string' && data.cues.message
        ? data.cues.message
        : ok ? `${shown}/${total} cues on screen at their time.` : `${total - shown} of ${total} cues are not on screen at their time.`,
      total,
      shown,
      missing,
    };
  }

  const ok = typeof data.ok === 'boolean' ? data.ok : (purity?.ok ?? true) && (cues?.ok ?? true);
  const message = [purity?.message, cues?.message].filter(Boolean).join(' ') || (ok ? 'Verified.' : 'Verify failed.');
  const report: VerifyReport = { ok, message };
  if (purity) report.purity = purity;
  if (cues) report.cues = cues;
  return report;
}

export function verifyText(report: VerifyReport): string {
  const lines = [report.purity?.message, report.cues?.message].filter((line): line is string => Boolean(line));
  if (!lines.length) lines.push(report.message);
  if (report.cues && !report.cues.ok) {
    const seen = report.cues.missing.filter((cue) => cue.seen !== undefined).slice(0, TEXT_MISSING);
    for (const cue of seen) {
      lines.push(`- "${cue.text}" (${secs(cue.start)}–${secs(cue.end)} s): the frame showed ${cue.seen ? `"${cue.seen}"` : 'no text'}.`);
    }
    lines.push('Show each cue for its whole time. A canvas page reports the text it draws with window.heliosDrawnText?.add(text).');
  }
  return lines.join('\n');
}
