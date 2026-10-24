import { accessSync, constants, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { runProcess } from './process.js';

export type MediaExecutable = 'ffmpeg' | 'ffprobe';
export type MediaExecutableSource = 'option' | 'env' | 'bundled' | 'path';
export interface ResolvedMediaExecutable { path: string; source: MediaExecutableSource }
export interface MediaExecutableLookup {
  env?: Record<string, string | undefined>;
  bundled?: Partial<Record<MediaExecutable, () => string | undefined>>;
}

/** Environment overrides, checked after an explicit option and before the bundled binary. */
export const MEDIA_EXECUTABLE_ENV: Record<MediaExecutable, string> = { ffmpeg: 'HELIOS_FFMPEG_PATH', ffprobe: 'HELIOS_FFPROBE_PATH' };
const INSTALLERS: Record<MediaExecutable, string> = { ffmpeg: '@ffmpeg-installer/ffmpeg', ffprobe: '@ffprobe-installer/ffprobe' };
const require = createRequire(import.meta.url);
const installed = new Map<MediaExecutable, string | undefined>();

function installerPath(name: MediaExecutable): string | undefined {
  if (!installed.has(name)) {
    let path: string | undefined;
    // The installers throw on unsupported platforms or a missing optional binary package.
    try { path = require(INSTALLERS[name]).path; } catch { path = undefined; }
    installed.set(name, path);
  }
  return installed.get(name);
}

function runnable(path: string | undefined): path is string {
  if (!path) return false;
  try { accessSync(path, constants.X_OK); return statSync(path).isFile(); } catch { return false; }
}

/**
 * Selects a media executable: explicit option, then HELIOS_FFMPEG_PATH /
 * HELIOS_FFPROBE_PATH, then the installer-provided binary, then PATH.
 */
export function resolveMediaExecutable(name: MediaExecutable, explicit?: string, lookup: MediaExecutableLookup = {}): ResolvedMediaExecutable {
  if (explicit) return { path: explicit, source: 'option' };
  const fromEnv = (lookup.env ?? process.env)[MEDIA_EXECUTABLE_ENV[name]];
  if (fromEnv) return { path: fromEnv, source: 'env' };
  let bundled: string | undefined;
  try { bundled = (lookup.bundled?.[name] ?? (() => installerPath(name)))(); } catch { bundled = undefined; }
  if (runnable(bundled)) return { path: bundled, source: 'bundled' };
  return { path: name, source: 'path' };
}

export const ffmpegPath = (explicit?: string) => resolveMediaExecutable('ffmpeg', explicit).path;
export const ffprobePath = (explicit?: string) => resolveMediaExecutable('ffprobe', explicit).path;

/**
 * Decode-side passthrough timing. `-fps_mode` arrived in FFmpeg 5.1 and later
 * releases removed `-vsync`; on older builds `-vsync 0` is the same passthrough mode.
 */
export function passthroughArgs(help: string): string[] {
  return /^-fps_mode\b/m.test(help) ? ['-fps_mode', 'passthrough'] : ['-vsync', '0'];
}
const versions = new Map<string, Promise<string>>();
const capabilities = new Map<string, Promise<string[]>>();
/** Probes once per binary path and `-version` build; the build is also hashed into the engine fingerprint. */
export function videoPassthroughArgs(ffmpeg: string): Promise<string[]> {
  let version = versions.get(ffmpeg);
  if (!version) {
    version = runProcess(ffmpeg, ['-version'], { timeoutMs: 10000 }).then(bytes => createHash('sha256').update(bytes).digest('hex'));
    versions.set(ffmpeg, version); version.catch(() => versions.delete(ffmpeg));
  }
  return version.then(build => {
    const key = `${ffmpeg}\0${build}`;
    let probe = capabilities.get(key);
    if (!probe) {
      probe = runProcess(ffmpeg, ['-hide_banner', '-h', 'full'], { timeoutMs: 10000, maxBytes: 16 * 1024 * 1024 }).then(help => passthroughArgs(help.toString()));
      capabilities.set(key, probe); probe.catch(() => capabilities.delete(key));
    }
    return probe;
  });
}
