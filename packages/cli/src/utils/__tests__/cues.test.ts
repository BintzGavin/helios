import { describe, it, expect } from 'vitest';
import { checkCues, cueSampleTimes, cueWords, parseCues } from '../cues.js';
import type { Cue, ScreenText } from '../cues.js';

describe('parseCues', () => {
  it('reads SRT, with or without cue numbers, CRLF line ends and a BOM', () => {
    const srt = '﻿1\r\n00:00:01,000 --> 00:00:02,500\r\nLadies and\r\ngentlemen\r\n\r\n00:00:03,250 --> 00:00:04,000\r\nAgents.\r\n';
    expect(parseCues(srt, 'song.srt')).toEqual([
      { text: 'Ladies and gentlemen', start: 1, end: 2.5 },
      { text: 'Agents.', start: 3.25, end: 4 },
    ]);
  });

  it('drops formatting tags and override codes that are not shown', () => {
    const srt = '1\n00:00:01.5 --> 1:00:02,000\n{\\an8}<i>Hello</i> <font color="red">world</font> &amp; you\n';
    expect(parseCues(srt, 'a.srt')).toEqual([{ text: 'Hello world & you', start: 1.5, end: 3602 }]);
  });

  it('reads WebVTT: header metadata, NOTE and STYLE blocks, cue ids, settings, voices and inline timestamps', () => {
    const vtt = [
      'WEBVTT - lyrics',
      'Kind: captions',
      '',
      'NOTE made by hand',
      '',
      'STYLE',
      '::cue { color: yellow }',
      '',
      'intro',
      '00:09.640 --> 00:09.980 align:start position:10%',
      '<v Claudia>gentle<00:09.800>men',
      '',
      '01:00:00.000 --> 01:00:01.000',
      'late',
    ].join('\n');
    expect(parseCues(vtt, 'words.vtt')).toEqual([
      { text: 'gentlemen', start: 9.64, end: 9.98 },
      { text: 'late', start: 3600, end: 3601 },
    ]);
  });

  it('reads JSON arrays, { cues } and { words } with the w / t0 / t1 aliases', () => {
    expect(parseCues('[{"text":"one","start":0.5,"end":1}]', 'a.json')).toEqual([{ text: 'one', start: 0.5, end: 1 }]);
    expect(parseCues('{"cues":[{"text":"two","start":1,"end":2}]}', 'a.json')).toEqual([{ text: 'two', start: 1, end: 2 }]);
    const words = '{"words":[{"i":0,"w":"ladies","line":0,"t0":9.32,"t1":9.64,"conf":0.91}],"lines":[{"text":"Ladies.","t0":9.32,"t1":10.72}]}';
    expect(parseCues(words, 'analysis/words.json')).toEqual([{ text: 'ladies', start: 9.32, end: 9.64 }]);
  });

  it('works out the format from the content when the extension does not say', () => {
    expect(parseCues('WEBVTT\n\n00:01.000 --> 00:02.000\nhi', 'lyrics.txt')).toEqual([{ text: 'hi', start: 1, end: 2 }]);
    expect(parseCues('00:00:01,000 --> 00:00:02,000\nhi', 'lyrics.txt')).toEqual([{ text: 'hi', start: 1, end: 2 }]);
    expect(parseCues(' [{"w":"hi","t0":1,"t1":2}]', 'lyrics')).toEqual([{ text: 'hi', start: 1, end: 2 }]);
    expect(() => parseCues('just words', 'lyrics.txt')).toThrow(/not an \.srt, \.vtt or \.json file/);
  });

  it('skips cues with no words in them', () => {
    expect(parseCues('[{"text":"♪ ♪","start":0,"end":1},{"text":"la","start":1,"end":2}]', 'a.json')).toEqual([{ text: 'la', start: 1, end: 2 }]);
  });

  it('says what is wrong with a bad file, and where', () => {
    expect(() => parseCues('', 'empty.srt')).toThrow('empty.srt has no cues with text in it');
    expect(() => parseCues('1\n00:00:02,000 --> 00:00:01,000\nback', 'a.srt')).toThrow('a.srt, line 2: the cue ends before it starts');
    expect(() => parseCues('1\n00:00:02 -> 00:00:03\nx', 'a.srt')).toThrow('a.srt, line 1: expected a timing line');
    expect(() => parseCues('1\nsoon --> later\nx', 'a.srt')).toThrow('a.srt, line 2: "soon" is not a timecode');
    expect(() => parseCues('{"cues":', 'a.json')).toThrow('a.json is not valid JSON');
    expect(() => parseCues('{"lines":[]}', 'a.json')).toThrow('"cues" or "words" array');
    expect(() => parseCues('[{"text":"x","end":1}]', 'a.json')).toThrow('a.json, cue 1 needs a "start" (or "t0") time in seconds');
    expect(() => parseCues('[{"text":"x","start":2,"end":1}]', 'a.json')).toThrow('no earlier than its start');
    expect(() => parseCues('[{"start":0,"end":1}]', 'a.json')).toThrow('has no "text" (or "w") string');
  });
});

describe('cueSampleTimes', () => {
  it('samples just after the start, the middle and just before the end', () => {
    expect(cueSampleTimes({ text: 'x', start: 10, end: 12 })).toEqual([10.12, 11, 11.88]);
    expect(cueSampleTimes({ text: 'x', start: 1, end: 1.16 })).toEqual([1.08]);
  });

  it('keeps short cues close to their middle and never samples before 0', () => {
    expect(cueSampleTimes({ text: 'x', start: 2, end: 2.04 })).toEqual([2.01, 2.02, 2.03]);
    expect(cueSampleTimes({ text: 'x', start: 0, end: 0 })).toEqual([0, 0.03]);
  });
});

describe('cueWords', () => {
  const joined = (text: string) => cueWords(text).map((word) => word.joined);

  it('ignores case, punctuation, whitespace, curly quotes and accents', () => {
    expect(joined('  “Ladies,”\n GENTLEMEN…  Café! ')).toEqual(['ladies', 'gentlemen', 'cafe']);
    expect(joined('Don’t')).toEqual(joined("DON'T"));
    expect(joined('Straße')).toEqual(joined('STRASSE'));
  });

  it('keeps the parts of hyphenated and dotted words', () => {
    expect(cueWords('twenty-five')).toEqual([{ joined: 'twentyfive', parts: ['twenty', 'five'] }]);
  });

  it('splits scripts written without spaces into characters', () => {
    expect(joined('我爱你')).toEqual(['我', '爱', '你']);
    expect(joined('ありがとう')).toEqual(['あ', 'り', 'が', 'と', 'う']);
  });
});

describe('checkCues', () => {
  const cue = (text: string, start: number, end: number): Cue => ({ text, start, end });
  const screens = (byTime: Record<number, Partial<ScreenText>>) => (t: number): ScreenText | undefined => {
    const screen = byTime[t];
    return screen ? { text: screen.text ?? [], drawn: screen.drawn ?? [] } : undefined;
  };

  it('passes a cue whose words all show in at least one of its samples, as a line revealed word by word', () => {
    const result = checkCues([cue('Ladies and gentlemen', 10, 12)], screens({
      10.12: { text: ['LADIES'] },
      11: { text: ['LADIES AND'] },
      11.88: { text: ['LADIES AND', 'GENTLEMEN.'] },
    }));
    expect(result).toEqual({ ok: true, total: 1, shown: 1, missing: [], message: '1/1 cues on screen at their time.' });
  });

  it('counts text the page declared drawn', () => {
    const result = checkCues([cue('agents', 1, 1.16)], screens({ 1.08: { drawn: ['AGENTS'] } }));
    expect(result.ok).toBe(true);
  });

  it('matches whole words, not letters inside other words', () => {
    const result = checkCues([cue('lad', 1, 1.16)], screens({ 1.08: { text: ['LADIES'] } }));
    expect(result.ok).toBe(false);
  });

  it('matches hyphenated words either way', () => {
    expect(checkCues([cue('twenty-five', 1, 1.16)], screens({ 1.08: { text: ['TWENTY FIVE'] } })).ok).toBe(true);
    expect(checkCues([cue('twenty five', 1, 1.16)], screens({ 1.08: { text: ['TWENTY-FIVE'] } })).ok).toBe(true);
    expect(checkCues([cue('twenty-five', 1, 1.16)], screens({ 1.08: { text: ['TWENTYFIVE'] } })).ok).toBe(true);
  });

  it('names the cues that are missing, with their times and what was on screen instead', () => {
    const result = checkCues(
      [cue('Ladies.', 9.32, 9.64), cue('gentlemen', 9.64, 9.98), cue('agents', 10, 10.5)],
      screens({ 9.44: { text: ['LADIES.'] }, 9.48: { text: ['LADIES.'] }, 9.52: { text: ['LADIES.'] }, 9.81: { text: ['LADIES.'], drawn: ['LADIES.', 'spark'] }, 10.25: { drawn: ['AGENTS'] } }),
    );
    expect(result.ok).toBe(false);
    expect(result.total).toBe(3);
    expect(result.shown).toBe(2);
    expect(result.missing).toEqual([{ text: 'gentlemen', start: 9.64, end: 9.98, seen: 'LADIES. spark' }]);
    expect(result.message).toMatch(/^1 of 3 cues are not on screen at their time: "gentlemen" \(9\.64–9\.98 s\)\. /);
    expect(result.message).toContain('window.heliosDrawnText?.add(text)');
  });

  it('lists the first five missing cues and counts the rest', () => {
    const cues = Array.from({ length: 8 }, (_, i) => cue(`word${i}`, i, i + 1));
    const result = checkCues(cues, () => undefined);
    expect(result.message).toMatch(/^8 of 8 cues are not on screen at their time: "word0" \(0–1 s\), "word1" \(1–2 s\), "word2" \(2–3 s\), "word3" \(3–4 s\), "word4" \(4–5 s\) and 3 more\./);
    expect(result.missing[0].seen).toBe('');
  });

  it('shortens long excerpts', () => {
    const result = checkCues([cue('missing', 1, 1.16)], screens({ 1.08: { text: ['x'.repeat(100)] } }));
    expect(result.missing[0].seen).toHaveLength(60);
    expect(result.missing[0].seen.endsWith('…')).toBe(true);
  });
});
