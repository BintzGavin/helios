export interface SubtitleCue {
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

export function parseCaptions(content: string): SubtitleCue[] {
  const trimmed = content.trim();
  if (trimmed.startsWith("WEBVTT")) {
    return parseWebVTT(content);
  }
  return parseSRT(content);
}

function parseWebVTT(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n");

  // Split into blocks by double newlines
  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l);

    // Skip header block or metadata blocks
    // Note: A robust parser would need to handle "WEBVTT" followed by text on the same line,
    // or metadata headers. For now we skip blocks starting with keywords.
    if (lines.length === 0 ||
        lines[0] === "WEBVTT" ||
        lines[0].startsWith("WEBVTT ") ||
        lines[0].startsWith("NOTE") ||
        lines[0].startsWith("STYLE") ||
        lines[0].startsWith("REGION")) {
      continue;
    }

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

    // WebVTT timestamp regex:
    // (HH:)MM:SS.mmm or (HH:)MM:SS,mmm
    const timeMatch = timeLine.match(/((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/);

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
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return NaN;
}

export function stringifySRT(cues: SubtitleCue[]): string {
  if (!cues || cues.length === 0) return "";

  return cues
    .map((cue, index) => {
      const start = formatTime(cue.startTime);
      const end = formatTime(cue.endTime);
      return `${index + 1}\n${start} --> ${end}\n${cue.text}\n\n`;
    })
    .join("");
}

function formatTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);

  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");

  return `${hh}:${mm}:${ss},${mmm}`;
}
