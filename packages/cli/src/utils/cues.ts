import fs from 'fs';
import path from 'path';

/** A piece of timed text (a lyric word or line, a caption) that must be on screen from start to end, in seconds. */
export interface Cue {
  text: string;
  start: number;
  end: number;
}

/** The text on screen in one frame: visible DOM/SVG text runs, and what the page declared drawn. */
export interface ScreenText {
  text: string[];
  drawn: string[];
}

export interface MissingCue extends Cue {
  /** A short excerpt of what was on screen in the middle of the cue. */
  seen: string;
}

export interface CueCheck {
  ok: boolean;
  total: number;
  shown: number;
  missing: MissingCue[];
  message: string;
}

/** Reads an .srt, .vtt or .json file of timed text. */
export function readCueFile(file: string): Cue[] {
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    throw new Error(`Could not read ${file}: ${err.code === 'ENOENT' ? 'no such file' : err.message}`);
  }
  return parseCues(content, file);
}

/**
 * Parses timed text. The format comes from the file extension (.srt, .vtt, .json), or from
 * the content for other names. Cues with no letters or digits (a "♪") are dropped: there is
 * nothing to look for.
 */
export function parseCues(content: string, fileName: string): Cue[] {
  const text = content.replace(/^﻿/, '');
  const ext = path.extname(fileName).toLowerCase();
  const trimmed = text.trimStart();
  const format = ext === '.json' || ext === '.srt' || ext === '.vtt'
    ? ext.slice(1)
    : /^[[{]/.test(trimmed) ? 'json' : /^WEBVTT/.test(trimmed) ? 'vtt' : /-->/.test(trimmed) ? 'srt' : undefined;
  if (!format) {
    throw new Error(`${fileName} is not an .srt, .vtt or .json file of timed text`);
  }
  const name = path.basename(fileName);
  const cues = (format === 'json' ? parseJsonCues(text, name) : parseTimedTextBlocks(text, name, format))
    .filter((cue) => cueWords(cue.text).length > 0);
  if (cues.length === 0) {
    throw new Error(`${name} has no cues with text in it`);
  }
  return cues;
}

const TIMECODE = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/;

function parseTimecode(value: string, name: string, line: number): number {
  const match = TIMECODE.exec(value.trim());
  if (!match) {
    throw new Error(`${name}, line ${line}: "${value.trim()}" is not a timecode like 00:01:02,500`);
  }
  const [, hours, minutes, seconds, fraction] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + (fraction ? Number(`0.${fraction}`) : 0);
}

/** SRT and WebVTT: blocks separated by blank lines; a cue is a "start --> end" line and its text lines. */
function parseTimedTextBlocks(content: string, name: string, format: string): Cue[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const cues: Cue[] = [];
  let i = 0;
  while (i < lines.length) {
    // One block: up to the next blank line.
    const start = i;
    while (i < lines.length && lines[i].trim() !== '') i++;
    const block = lines.slice(start, i);
    while (i < lines.length && lines[i].trim() === '') i++;
    if (block.length === 0) continue;
    // WebVTT header, NOTE, STYLE and REGION blocks carry no cue.
    if (format === 'vtt' && /^(WEBVTT|NOTE|STYLE|REGION)\b/.test(block[0])) continue;
    const timing = block.findIndex((line) => line.includes('-->'));
    if (timing === -1) {
      throw new Error(`${name}, line ${start + 1}: expected a timing line like "00:00:01,000 --> 00:00:02,500"`);
    }
    const [from, rest] = block[timing].split('-->');
    const lineNumber = start + timing + 1;
    const cueStart = parseTimecode(from, name, lineNumber);
    // WebVTT puts cue settings after the end time ("00:02.000 align:start").
    const cueEnd = parseTimecode(rest.trim().split(/\s+/)[0] ?? '', name, lineNumber);
    if (cueEnd < cueStart) {
      throw new Error(`${name}, line ${lineNumber}: the cue ends before it starts`);
    }
    cues.push({ text: cleanCueText(block.slice(timing + 1).join('\n')), start: cueStart, end: cueEnd });
  }
  return cues;
}

/** Drops markup that is not shown as text: <i>, <v Speaker>, <00:01.000>, {\an8}, entities. */
function cleanCueText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|lrm|rlm);/g, (_, entity: string) => (
      { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lrm: '', rlm: '' } as Record<string, string>
    )[entity])
    .replace(/\s+/g, ' ')
    .trim();
}

/** An array of { text, start, end }, or an object whose `cues` or `words` holds one; w / t0 / t1 are accepted too. */
function parseJsonCues(content: string, name: string): Cue[] {
  let data: any;
  try {
    data = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`${name} is not valid JSON: ${err.message}`);
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.cues) ? data.cues : Array.isArray(data?.words) ? data.words : undefined;
  if (!list) {
    throw new Error(`${name} must hold an array of { "text", "start", "end" } cues, or an object with a "cues" or "words" array`);
  }
  return list.map((item: any, index: number) => {
    const where = `${name}, cue ${index + 1}`;
    if (!item || typeof item !== 'object') throw new Error(`${where} is not an object`);
    const text = item.text ?? item.w;
    const start = item.start ?? item.t0;
    const end = item.end ?? item.t1;
    if (typeof text !== 'string') throw new Error(`${where} has no "text" (or "w") string`);
    if (typeof start !== 'number' || !Number.isFinite(start) || start < 0) {
      throw new Error(`${where} needs a "start" (or "t0") time in seconds`);
    }
    if (typeof end !== 'number' || !Number.isFinite(end) || end < start) {
      throw new Error(`${where} needs an "end" (or "t1") time in seconds, no earlier than its start`);
    }
    return { text: cleanCueText(text), start, end };
  });
}

/** Rounds away float noise so equal sample times compare equal. */
function roundTime(t: number): number {
  return Math.round(t * 1e6) / 1e6;
}

/**
 * When to look for a cue: just after it starts (t0 + clamp(d/2, 0.03, 0.12), as the lyric gate
 * does), in the middle, and just before it ends. A cue passes when each of its words shows in
 * at least one of these, so words revealed one after another within a line count.
 */
export function cueSampleTimes(cue: Cue): number[] {
  const inset = Math.min(0.12, Math.max(0.03, (cue.end - cue.start) / 2));
  const times = [cue.start + inset, (cue.start + cue.end) / 2, cue.end - inset].map((t) => roundTime(Math.max(0, t)));
  return [...new Set(times)].sort((a, b) => a - b);
}

// Scripts written without spaces between words: each character is matched on its own.
const UNSPACED = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}])/gu;

/**
 * Case, accents, curly quotes and compatibility forms folded away; scripts without spaces
 * spaced out. Only the combining accents of Latin, Greek and Cyrillic are dropped: other
 * scripts' marks (kana voicing, Indic vowel signs) change the word.
 */
function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(UNSPACED, ' $1 ');
}

/**
 * The words of a text, for matching. Each whitespace-separated chunk gives its parts split at
 * punctuation and the parts run together, so "twenty-five" matches "twenty five" and
 * "TWENTYFIVE", and "don't" matches "DONT".
 */
export function cueWords(text: string): Array<{ joined: string; parts: string[] }> {
  const words: Array<{ joined: string; parts: string[] }> = [];
  for (const chunk of fold(text).split(/\s+/)) {
    const parts = chunk.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);
    if (parts.length > 0) words.push({ joined: parts.join(''), parts });
  }
  return words;
}

/** Every matchable form of the words in some on-screen text. */
function screenWords(texts: string[], into: Set<string>): void {
  for (const text of texts) {
    for (const word of cueWords(text)) {
      into.add(word.joined);
      for (const part of word.parts) into.add(part);
    }
  }
}

function excerpt(screen: ScreenText | undefined): string {
  if (!screen) return '';
  const pieces = [...new Set([...screen.text, ...screen.drawn].map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  const text = pieces.join(' ');
  return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
}

function formatSeconds(t: number): string {
  return String(Number(t.toFixed(3)));
}

function quote(text: string): string {
  return `"${text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text}"`;
}

const LISTED = 5;

/**
 * Checks each cue against the text on screen at its sample times (see cueSampleTimes):
 * a cue is shown when every one of its words was on screen in at least one of them.
 */
export function checkCues(cues: Cue[], screenAt: (t: number) => ScreenText | undefined): CueCheck {
  const missing: MissingCue[] = [];
  for (const cue of cues) {
    const times = cueSampleTimes(cue);
    const seen = new Set<string>();
    for (const t of times) {
      const screen = screenAt(t);
      if (screen) screenWords([...screen.text, ...screen.drawn], seen);
    }
    const shown = cueWords(cue.text).every((word) => seen.has(word.joined) || word.parts.every((part) => seen.has(part)));
    if (!shown) {
      missing.push({ ...cue, seen: excerpt(screenAt(times[Math.floor(times.length / 2)])) });
    }
  }

  const total = cues.length;
  const shown = total - missing.length;
  if (missing.length === 0) {
    return { ok: true, total, shown, missing, message: `${shown}/${total} cues on screen at their time.` };
  }
  const listed = missing.slice(0, LISTED).map((cue) => `${quote(cue.text)} (${formatSeconds(cue.start)}–${formatSeconds(cue.end)} s)`);
  const more = missing.length > LISTED ? ` and ${missing.length - LISTED} more` : '';
  const message = `${missing.length} of ${total} cues are not on screen at their time: ${listed.join(', ')}${more}. ` +
    'Text counts when it is visible DOM or SVG text inside the frame during its time, or when the page marks it as drawn ' +
    'for that frame with window.heliosDrawnText?.add(text) (for text drawn on a canvas).';
  return { ok: false, total, shown, missing, message };
}
