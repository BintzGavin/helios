import { stripAnsi } from './cli-runner.js';

/**
 * Reads what `helios verify --json` writes, and turns
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
