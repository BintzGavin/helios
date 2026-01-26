import { HeliosError, HeliosErrorCode } from './errors';

export interface CaptionCue {
  id: string;
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
  text: string;
}

function parseTimecode(timecode: string): number {
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

    const startTime = parseTimecode(timecodeMatch[1]);
    const endTime = parseTimecode(timecodeMatch[2]);
    const text = lines.slice(timecodeLineIndex + 1).join('\n');

    return {
      id,
      startTime,
      endTime,
      text,
    };
  });
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
