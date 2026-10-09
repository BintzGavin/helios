/**
 * `helios verify --cues` end to end: real pages in headless Chromium through the real
 * renderer. Needs a built renderer (npm run build -w packages/renderer) and core.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { registerFrameCommands } from '../frames.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coreUrl = pathToFileURL(path.resolve(__dirname, '../../../../core/dist/index.js')).href;

interface Word {
  w: string;
  t0: number;
  t1: number;
  /** How the page gets this word wrong: never shows it, shows it at opacity 0, or off-screen. */
  fault?: 'never' | 'transparent' | 'offscreen';
}

const WORDS: Word[] = [
  { w: 'Ladies', t0: 0.2, t1: 0.6 },
  { w: 'and', t0: 0.6, t1: 0.8 },
  { w: 'gentlemen,', t0: 0.8, t1: 1.4 },
  { w: 'this', t0: 1.6, t1: 1.8 },
  { w: 'is', t0: 1.8, t1: 1.9 },
  { w: 'your', t0: 1.9, t1: 2.1 },
  { w: 'captain', t0: 2.1, t1: 2.6 },
  { w: 'speaking.', t0: 2.6, t1: 3.2 },
];
const DURATION = 3.5;

/** A renderAt page that lights each word of its line from the word's start to the line's end. */
function domLyricPage(words: Word[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#000;overflow:hidden;color:#fff;font:700 40px/1.2 sans-serif}
    #line{position:absolute;left:40px;top:150px;white-space:nowrap}
    #line span{opacity:0}
  </style></head><body><div id="line"></div><script>
    const WORDS = ${JSON.stringify(words)};
    const line = document.getElementById('line');
    const spans = WORDS.map((word, i) => {
      const span = document.createElement('span');
      span.textContent = word.w;
      line.append(span, i < WORDS.length - 1 ? ' ' : '');
      return span;
    });
    window.renderAt = (t) => {
      // Two lines: the words before 1.5 s, then the rest.
      const lineEnd = t < 1.5 ? 1.5 : ${DURATION};
      const lineStart = t < 1.5 ? 0 : 1.5;
      WORDS.forEach((word, i) => {
        const lit = word.fault !== 'never' && word.t0 <= t && word.t0 >= lineStart && t < lineEnd;
        spans[i].style.opacity = lit && word.fault !== 'transparent' ? 1 : 0;
        spans[i].style.display = word.t0 >= lineStart && word.t0 < lineEnd ? '' : 'none';
        spans[i].style.position = 'relative';
        spans[i].style.left = word.fault === 'offscreen' ? '-3000px' : '';
      });
    };
  </script></body></html>`;
}

/** A canvas page that draws the sung word, and marks it for the check when `mark` is set. */
function canvasLyricPage(words: Word[], mark: boolean): string {
  return `<!doctype html><html><head><style>html,body{margin:0;background:#000;overflow:hidden}</style></head><body>
  <canvas id="c" width="640" height="360"></canvas><script>
    const WORDS = ${JSON.stringify(words)};
    const g = document.getElementById('c').getContext('2d', { willReadFrequently: true });
    window.renderAt = (t) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000'; g.fillRect(0, 0, 640, 360);
      g.fillStyle = '#fff'; g.font = '700 48px sans-serif';
      const word = WORDS.find((w) => w.t0 <= t && t < w.t1);
      if (!word) return;
      g.fillText(word.w, 40, 200);
      ${mark ? 'window.heliosDrawnText?.add(word.w);' : ''}
    };
  </script></body></html>`;
}

/** A Helios composition that shows the sung word in the DOM. */
function heliosLyricPage(words: Word[]): string {
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#000;overflow:hidden;color:#fff;font:700 40px sans-serif}
  </style></head><body><div id="word" style="position:absolute;left:40px;top:150px"></div>
  <script type="module">
    import { Helios } from '${coreUrl}';
    const WORDS = ${JSON.stringify(words)};
    const el = document.getElementById('word');
    const helios = new Helios({ duration: ${DURATION}, fps: 30, width: 640, height: 360 });
    helios.bindToDocumentTimeline();
    helios.subscribe(({ currentFrame }) => {
      const t = currentFrame / 30;
      el.textContent = WORDS.find((w) => w.t0 <= t && t < w.t1)?.w ?? '';
    });
    window.helios = helios;
  </script></body></html>`;
}

const wordsJson = (words: Word[]) => JSON.stringify({ words: words.map(({ w, t0, t1 }) => ({ w, t0, t1 })) });

describe('helios verify --cues with real pages', { timeout: 120_000 }, () => {
  let dir: string;
  let exitCode: number | undefined;
  let stdout: string;
  let errors: string;
  let logs: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-verify-cues-'));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    exitCode = undefined;
    stdout = '';
    errors = '';
    logs = '';
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { exitCode ??= code; }) as any);
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs += `${args.join(' ')}\n`; });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { errors += `${args.join(' ')}\n`; });
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: any) => { stdout += String(chunk); return true; }) as any);
    vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as any);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const write = (name: string, content: string) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, content);
    return file;
  };

  async function verify(page: string, cues: string, ...extra: string[]) {
    const program = new Command();
    registerFrameCommands(program);
    await program.parseAsync(['node', 'helios', 'verify', page, '--cues', cues, '--samples', '2', '--width', '640', '--height', '360', ...extra]);
  }

  it('passes a DOM page that shows every word at its time', async () => {
    const page = write('lyrics.html', domLyricPage(WORDS));
    await verify(page, write('lyrics.words.json', wordsJson(WORDS)), '--duration', String(DURATION));
    expect(errors).toBe('');
    expect(logs).toContain('8/8 cues on screen at their time.');
    expect(exitCode).toBeUndefined();
  });

  it('names the word a page never shows', async () => {
    const words = WORDS.map((w) => (w.w === 'gentlemen,' ? { ...w, fault: 'never' as const } : w));
    const page = write('missing.html', domLyricPage(words));
    await verify(page, write('missing.words.json', wordsJson(WORDS)), '--duration', String(DURATION));
    expect(errors).toMatch(/^1 of 8 cues are not on screen at their time: "gentlemen," \(0\.8–1\.4 s\)\./);
    expect(exitCode).toBe(1);
  });

  it('does not count a word drawn at opacity 0 or off-screen', async () => {
    const words = WORDS.map((w) => (w.w === 'captain' ? { ...w, fault: 'transparent' as const } : w.w === 'this' ? { ...w, fault: 'offscreen' as const } : w));
    const page = write('hidden.html', domLyricPage(words));
    await verify(page, write('hidden.words.json', wordsJson(WORDS)), '--duration', String(DURATION), '--json');
    expect(exitCode).toBe(1);
    const result = JSON.parse(stdout);
    expect(result.ok).toBe(false);
    expect(result.purity.ok).toBe(true);
    expect(result.cues).toEqual(expect.objectContaining({ ok: false, total: 8, shown: 6 }));
    expect(result.cues.missing.map((cue: any) => cue.text)).toEqual(['this', 'captain']);
    expect(result.cues.missing[1].seen).toBe('is your');
  });

  it('passes a canvas page that marks the words it draws, and fails one that does not', async () => {
    const srt = WORDS.map((w, i) => `${i + 1}\n${srtTime(w.t0)} --> ${srtTime(w.t1)}\n${w.w}\n`).join('\n');
    const cues = write('lyrics.srt', srt);

    await verify(write('canvas-marked.html', canvasLyricPage(WORDS, true)), cues, '--duration', String(DURATION));
    expect(errors).toBe('');
    expect(logs).toContain('8/8 cues on screen at their time.');
    expect(exitCode).toBeUndefined();

    await verify(write('canvas-unmarked.html', canvasLyricPage(WORDS, false)), cues, '--duration', String(DURATION));
    expect(errors).toMatch(/^8 of 8 cues are not on screen at their time: .* and 3 more\. .*window\.heliosDrawnText\?\.add\(text\)/);
    expect(exitCode).toBe(1);
  });

  it('works for a Helios composition, taking the duration from it', async () => {
    const page = write('helios.html', heliosLyricPage(WORDS));
    const vtt = `WEBVTT\n\n${WORDS.map((w) => `${vttTime(w.t0)} --> ${vttTime(w.t1)}\n${w.w}\n`).join('\n')}`;
    await verify(page, write('lyrics.vtt', vtt), '--no-serve', '--json');
    const result = JSON.parse(stdout);
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(result.cues).toEqual({ ok: true, total: 8, shown: 8, missing: [], message: '8/8 cues on screen at their time.' });
    expect(exitCode).toBeUndefined();
  });
});

function srtTime(t: number): string {
  const ms = Math.round(t * 1000);
  return `00:00:${String(Math.floor(ms / 1000)).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function vttTime(t: number): string {
  return srtTime(t).slice(3).replace(',', '.');
}
