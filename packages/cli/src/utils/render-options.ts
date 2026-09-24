import path from 'path';
import { pathToFileURL } from 'url';
import { serveLocalPage } from './serve.js';

export const DEFAULT_FPS = 30;
export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;

export function parsePositive(value: string | undefined, flag: string, integer = false): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) {
    throw new Error(`${flag} must be a positive ${integer ? 'integer' : 'number'} (got "${value}")`);
  }
  return n;
}

/** "0.5,3,7.25" → [0.5, 3, 7.25]; times may be 0. */
export function parseTimes(value: string, flag: string): number[] {
  const times = value.split(',').map((part) => part.trim()).filter(Boolean).map(Number);
  if (times.length === 0 || times.some((t) => !Number.isFinite(t) || t < 0)) {
    throw new Error(`${flag} takes seconds separated by commas, e.g. 0.5,3,7.25 (got "${value}")`);
  }
  return times;
}

/** "2:3.5" → [2, 3.5] */
export function parseRange(value: string, flag: string): [number, number] {
  const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!match || Number(match[2]) <= Number(match[1])) {
    throw new Error(`${flag} takes start:end in seconds, e.g. 2:3.5 (got "${value}")`);
  }
  return [Number(match[1]), Number(match[2])];
}

/** "600,300,720,480" → { x, y, width, height } */
export function parseCrop(value: string | undefined): { x: number; y: number; width: number; height: number } | undefined {
  if (value === undefined) return undefined;
  const parts = value.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0) || parts[2] === 0 || parts[3] === 0) {
    throw new Error(`--crop takes x,y,width,height in pixels, e.g. 600,300,720,480 (got "${value}")`);
  }
  const [x, y, width, height] = parts;
  return { x, y, width, height };
}

/** True for inputs with a scheme, like https://…, http://localhost:5173/ or file:///…. */
export function isUrl(input: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(input);
}

/** A composition URL from a CLI input: URLs pass through, anything else is a local path. */
export function toCompositionUrl(input: string): string {
  return isUrl(input) ? input : pathToFileURL(path.resolve(process.cwd(), input)).href;
}

/**
 * Runs fn with a URL for the input. URLs pass through. A local page is served over http on
 * 127.0.0.1 for the duration (so it can fetch() files next to it), unless serve is false.
 */
export async function withCompositionUrl<T>(input: string, serve: boolean, fn: (url: string) => Promise<T>): Promise<T> {
  if (isUrl(input) || !serve) return fn(toCompositionUrl(input));
  const served = await serveLocalPage(path.resolve(process.cwd(), input));
  try {
    return await fn(served.url);
  } finally {
    await served.close();
  }
}
