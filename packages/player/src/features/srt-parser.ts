export interface SubtitleCue {
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export function parseSRT(srt: string): SubtitleCue[] {
  if (!srt) return [];

  const cues: SubtitleCue[] = [];
  // Normalize line endings and split by double newlines to separate blocks
  const blocks = srt.trim().replace(/\r\n/g, "\n").split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 2) continue;

    // Usually:
    // Line 1: Index
    // Line 2: Timestamp range
    // Line 3+: Text

    // But sometimes index is missing or we need to be robust.
    // We look for the timestamp line.
    let timeLineIndex = -1;

    for (let i = 0; i < Math.min(lines.length, 2); i++) {
        if (lines[i].includes("-->")) {
            timeLineIndex = i;
            break;
        }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const textLines = lines.slice(timeLineIndex + 1);

    // Format: 00:00:01,000 --> 00:00:04,000
    // We allow dot or comma for milliseconds
    const timeMatch = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/);

    if (timeMatch) {
      const startTime = parseTime(timeMatch[1]);
      const endTime = parseTime(timeMatch[2]);
      const text = textLines.join("\n").trim();

      if (!isNaN(startTime) && !isNaN(endTime)) {
        cues.push({ startTime, endTime, text });
      }
    }
  }

  return cues;
}

function parseTime(timeString: string): number {
  // Normalize comma to dot for parseFloat
  const parts = timeString.replace(",", ".").split(":");
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return NaN;
}
