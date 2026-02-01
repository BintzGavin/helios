import { HeliosError, HeliosErrorCode } from './errors.js';

export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
}

function parseSrtTimecode(timecode: string): number {
  const match = timecode.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_SRT_FORMAT,
      `Invalid timecode format: ${timecode}`,
      'Timecode must be in HH:MM:SS,mmm format'
    );
  }
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    parseInt(hours, 10) * 3600000 +
    parseInt(minutes, 10) * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(milliseconds, 10)
  );
}

function parseVttTimecode(timecode: string): number {
  // WebVTT allows MM:SS.mmm or HH:MM:SS.mmm
  const matchFull = timecode.match(/^(\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/);
  const matchShort = timecode.match(/^(\d{2}):(\d{2})\.(\d{3})$/);

  if (matchFull) {
    const [, hours, minutes, seconds, milliseconds] = matchFull;
    return (
      parseInt(hours, 10) * 3600000 +
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );
  } else if (matchShort) {
    const [, minutes, seconds, milliseconds] = matchShort;
    return (
      parseInt(minutes, 10) * 60000 +
      parseInt(seconds, 10) * 1000 +
      parseInt(milliseconds, 10)
    );
  } else {
    throw new HeliosError(
      HeliosErrorCode.INVALID_WEBVTT_FORMAT,
      `Invalid timecode format: ${timecode}`,
      'Timecode must be in MM:SS.mmm or HH:MM:SS.mmm format'
    );
  }
}

function formatTimecode(milliseconds: number): string {
  const rounded = Math.floor(milliseconds);
  const hours = Math.floor(rounded / 3600000);
  const minutes = Math.floor((rounded % 3600000) / 60000);
  const seconds = Math.floor((rounded % 60000) / 1000);
  const ms = rounded % 1000;

  const pad = (num: number, size: number) => num.toString().padStart(size, '0');

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(ms, 3)}`;
}

export function parseSrt(content: string): CaptionCue[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n\n+/);
  return blocks.map((block, index) => {
    const lines = block.split('\n');
    let id = '';
    let timecodeLineIndex = 0;

    // Try to parse ID
    if (lines.length >= 2 && lines[0].match(/^\d+$/) && lines[1].includes('-->')) {
      id = lines[0];
      timecodeLineIndex = 1;
    } else if (lines[0].includes('-->')) {
      // ID is missing, but valid SRT block
      timecodeLineIndex = 0;
      id = (index + 1).toString();
    } else {
      throw new HeliosError(
        HeliosErrorCode.INVALID_SRT_FORMAT,
        `Invalid SRT block at index ${index}`,
        'Block must start with ID or timecodes'
      );
    }

    const timecodeLine = lines[timecodeLineIndex];
    const timecodeMatch = timecodeLine.match(/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);

    if (!timecodeMatch) {
      throw new HeliosError(
        HeliosErrorCode.INVALID_SRT_FORMAT,
        `Invalid timecode line: ${timecodeLine}`,
        'Timecode line must match "HH:MM:SS,mmm --> HH:MM:SS,mmm"'
      );
    }

    const startTime = parseSrtTimecode(timecodeMatch[1]);
    const endTime = parseSrtTimecode(timecodeMatch[2]);
    const text = lines.slice(timecodeLineIndex + 1).join('\n');

    return {
      id,
      startTime,
      endTime,
      text,
    };
  });
}

export function parseWebVTT(content: string): CaptionCue[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized.startsWith('WEBVTT')) {
     throw new HeliosError(
        HeliosErrorCode.INVALID_WEBVTT_FORMAT,
        'Missing WEBVTT header',
        'WebVTT file must start with "WEBVTT"'
      );
  }

  // Split by double newlines, ignoring the header block
  const blocks = normalized.split(/\n\n+/);
  const cues: CaptionCue[] = [];

  // Skip the first block if it is just the header
  // Note: The header might contain metadata lines before the first double newline
  let startIndex = 0;
  if (blocks[0].startsWith('WEBVTT')) {
     startIndex = 1;
  }

  for (let i = startIndex; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // WebVTT comments start with NOTE
    if (block.startsWith('NOTE')) continue;

    const lines = block.split('\n');
    let id = '';
    let timecodeLineIndex = 0;

    // Optional ID
    if (lines.length >= 2 && !lines[0].includes('-->')) {
      id = lines[0];
      timecodeLineIndex = 1;
    } else if (lines[0].includes('-->')) {
        timecodeLineIndex = 0;
        id = (cues.length + 1).toString();
    } else {
        // Might be a style block or something else we don't support, skip or throw?
        // For robustness, if we can't find '-->', we skip.
        // Actually, let's look for the arrow line.
        const arrowIndex = lines.findIndex(l => l.includes('-->'));
        if (arrowIndex === -1) {
            // Invalid block or non-cue block (like Region definition)
            continue;
        }
        if (arrowIndex === 1) {
            id = lines[0];
            timecodeLineIndex = 1;
        } else {
            timecodeLineIndex = arrowIndex;
            id = (cues.length + 1).toString();
        }
    }

    const timecodeLine = lines[timecodeLineIndex];
    // WebVTT timecode line: "00:00:00.000 --> 00:00:05.000 align:start size:50%"
    // We only care about the timecodes.
    const timecodeMatch = timecodeLine.match(/^((?:(?:\d{2,}:)?\d{2}:\d{2}\.\d{3})) --> ((?:(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}))/);

    if (!timecodeMatch) {
       continue; // Skip invalid blocks
    }

    try {
      const startTime = parseVttTimecode(timecodeMatch[1]);
      const endTime = parseVttTimecode(timecodeMatch[2]);
      const text = lines.slice(timecodeLineIndex + 1).join('\n');

      cues.push({
        id,
        startTime,
        endTime,
        text
      });
    } catch (e) {
      // Ignore invalid timecodes in specific blocks
      continue;
    }
  }

  return cues;
}

export function parseCaptions(content: string): CaptionCue[] {
  const trimmed = content.trim();
  if (trimmed.startsWith('WEBVTT')) {
    return parseWebVTT(content);
  }
  return parseSrt(content);
}

export function stringifySrt(cues: CaptionCue[]): string {
  return cues
    .map((cue, index) => {
      const id = cue.id || (index + 1).toString();
      const startTime = formatTimecode(cue.startTime);
      const endTime = formatTimecode(cue.endTime);
      return `${id}\n${startTime} --> ${endTime}\n${cue.text}`;
    })
    .join('\n\n');
}

export function findActiveCues(cues: CaptionCue[], timeMs: number): CaptionCue[] {
  return cues.filter((cue) => cue.startTime <= timeMs && cue.endTime >= timeMs);
}

export function areCuesEqual(a: CaptionCue[], b: CaptionCue[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
