import { HeliosError, HeliosErrorCode } from './errors.js';

export function framesToTimecode(frame: number, fps: number): string {
  if (fps <= 0) {
    throw new HeliosError(HeliosErrorCode.INVALID_FPS, "FPS must be greater than 0");
  }

  // Ensure frame is non-negative and integer
  const safeFrame = Math.max(0, Math.floor(frame));

  const totalSeconds = Math.floor(safeFrame / fps);
  const f = safeFrame % fps;
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

export function timecodeToFrames(timecode: string, fps: number): number {
  if (fps <= 0) {
    throw new HeliosError(HeliosErrorCode.INVALID_FPS, "FPS must be greater than 0");
  }

  const match = timecode.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    throw new HeliosError(
      HeliosErrorCode.INVALID_TIMECODE_FORMAT,
      `Invalid timecode format: ${timecode}`,
      "Timecode must be in HH:MM:SS:FF format"
    );
  }

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const f = parseInt(match[4], 10);

  return (h * 3600 + m * 60 + s) * fps + f;
}

export function framesToTimestamp(frame: number, fps: number): string {
  if (fps <= 0) {
     throw new HeliosError(HeliosErrorCode.INVALID_FPS, "FPS must be greater than 0");
  }

  const safeFrame = Math.max(0, frame);
  const totalMs = (safeFrame / fps) * 1000;

  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);

  const pad = (n: number, width: number = 2) => n.toString().padStart(width, '0');

  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}
