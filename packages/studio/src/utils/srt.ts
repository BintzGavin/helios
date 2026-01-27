import { CaptionCue } from '@helios-project/core';

function formatTimecode(milliseconds: number): string {
  const rounded = Math.floor(milliseconds);
  const hours = Math.floor(rounded / 3600000);
  const minutes = Math.floor((rounded % 3600000) / 60000);
  const seconds = Math.floor((rounded % 60000) / 1000);
  const ms = rounded % 1000;

  const pad = (num: number, size: number) => num.toString().padStart(size, '0');

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(ms, 3)}`;
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
