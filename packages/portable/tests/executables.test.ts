import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { passthroughArgs, resolveMediaExecutable, videoPassthroughArgs } from '../src/executables.js';
import { NativeBackend } from '../src/backend.js';
import { parsePlan } from '../src/plan.js';
import { probeVideo, renderVideo } from '../src/render.js';
import { runCli } from '../src/cli.js';

const require = createRequire(import.meta.url);
const supported = ['darwin-arm64', 'linux-x64'].includes(`${process.platform}-${process.arch}`);
// The resolver only accepts a bundled binary that exists and is executable.
let fakes: string, fake = { ffmpeg: '', ffprobe: '' };
const bundled = { ffmpeg: () => fake.ffmpeg, ffprobe: () => fake.ffprobe };

beforeAll(async () => {
  fakes = await mkdtemp(join(tmpdir(), 'helios-bundled-'));
  fake = { ffmpeg: await executable(fakes, 'ffmpeg', 'exit 0'), ffprobe: await executable(fakes, 'ffprobe', 'exit 0') };
});
afterAll(async () => { await rm(fakes, { recursive: true, force: true }); });
afterEach(() => { vi.unstubAllEnvs(); });

async function executable(dir: string, name: string, body: string) {
  const path = join(dir, name);
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
  return path;
}

describe('media executable precedence', () => {
  it('prefers an explicit option over the environment and the bundled binary', () => {
    const env = { HELIOS_FFMPEG_PATH: '/env/ffmpeg', HELIOS_FFPROBE_PATH: '/env/ffprobe' };
    expect(resolveMediaExecutable('ffmpeg', '/explicit/ffmpeg', { env, bundled })).toEqual({ path: '/explicit/ffmpeg', source: 'option' });
    expect(resolveMediaExecutable('ffprobe', '/explicit/ffprobe', { env, bundled })).toEqual({ path: '/explicit/ffprobe', source: 'option' });
  });

  it('prefers HELIOS_FFMPEG_PATH and HELIOS_FFPROBE_PATH over the bundled binary', () => {
    const env = { HELIOS_FFMPEG_PATH: '/env/ffmpeg', HELIOS_FFPROBE_PATH: '/env/ffprobe' };
    expect(resolveMediaExecutable('ffmpeg', undefined, { env, bundled })).toEqual({ path: '/env/ffmpeg', source: 'env' });
    expect(resolveMediaExecutable('ffprobe', undefined, { env, bundled })).toEqual({ path: '/env/ffprobe', source: 'env' });
  });

  it('keeps each tool on its own variable', () => {
    const env = { HELIOS_FFMPEG_PATH: '/env/ffmpeg' };
    expect(resolveMediaExecutable('ffprobe', undefined, { env, bundled })).toEqual({ path: fake.ffprobe, source: 'bundled' });
  });

  it('treats empty options and variables as unset', () => {
    const env = { HELIOS_FFMPEG_PATH: '', HELIOS_FFPROBE_PATH: '' };
    expect(resolveMediaExecutable('ffmpeg', '', { env, bundled })).toEqual({ path: fake.ffmpeg, source: 'bundled' });
    expect(resolveMediaExecutable('ffprobe', '', { env, bundled })).toEqual({ path: fake.ffprobe, source: 'bundled' });
  });

  it('falls back to PATH when no bundled binary is available', () => {
    const missing = { ffmpeg: () => undefined, ffprobe: () => undefined };
    expect(resolveMediaExecutable('ffmpeg', undefined, { env: {}, bundled: missing })).toEqual({ path: 'ffmpeg', source: 'path' });
    expect(resolveMediaExecutable('ffprobe', undefined, { env: {}, bundled: missing })).toEqual({ path: 'ffprobe', source: 'path' });
  });

  it('falls back to PATH when the bundled lookup throws', () => {
    const broken = { ffmpeg: () => { throw 'Unsupported platform/architecture'; }, ffprobe: () => { throw new Error('missing'); } };
    expect(resolveMediaExecutable('ffmpeg', undefined, { env: {}, bundled: broken })).toEqual({ path: 'ffmpeg', source: 'path' });
    expect(resolveMediaExecutable('ffprobe', undefined, { env: {}, bundled: broken })).toEqual({ path: 'ffprobe', source: 'path' });
  });

  it.runIf(supported)('uses the installed @ffmpeg-installer and @ffprobe-installer binaries by default', () => {
    expect(resolveMediaExecutable('ffmpeg', undefined, { env: {} })).toEqual({ path: require('@ffmpeg-installer/ffmpeg').path, source: 'bundled' });
    expect(resolveMediaExecutable('ffprobe', undefined, { env: {} })).toEqual({ path: require('@ffprobe-installer/ffprobe').path, source: 'bundled' });
  });

  it('skips a bundled binary that is not executable', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-executables-'));
    try {
      const path = join(dir, 'ffmpeg'); await writeFile(path, ''); await chmod(path, 0o644);
      expect(resolveMediaExecutable('ffmpeg', undefined, { env: {}, bundled: { ffmpeg: () => path, ffprobe: () => path } })).toEqual({ path: 'ffmpeg', source: 'path' });
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});

describe('media executable use', () => {
  it('renders and verifies through the binaries named by the environment', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-executables-'));
    try {
      const log = join(dir, 'calls.log');
      // Wrappers delegate to the default resolution so the real codecs still run.
      const real = { ffmpeg: resolveMediaExecutable('ffmpeg').path, ffprobe: resolveMediaExecutable('ffprobe').path };
      vi.stubEnv('HELIOS_FFMPEG_PATH', await executable(dir, 'ffmpeg-wrapper', `echo ffmpeg >> '${log}'\nexec '${real.ffmpeg}' "$@"`));
      vi.stubEnv('HELIOS_FFPROBE_PATH', await executable(dir, 'ffprobe-wrapper', `echo ffprobe >> '${log}'\nexec '${real.ffprobe}' "$@"`));
      const plan = parsePlan({ version: 'portable-v1', width: 32, height: 32, fps: { num: 30, den: 1 }, frameCount: 3, background: '#000000', nodes: [] });
      const output = join(dir, 'out.mp4');
      await renderVideo(plan, new Map(), output);
      expect(await probeVideo(output)).toMatchObject({ frameCount: 3 });
      const calls = (await readFile(log, 'utf8')).trim().split('\n');
      expect(calls).toContain('ffmpeg');
      expect(calls).toContain('ffprobe');
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);

  it('fingerprints the binaries that resolution selects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-executables-'));
    try {
      const a = { ffmpeg: await executable(dir, 'ffmpeg-a', 'echo ffmpeg build A'), ffprobe: await executable(dir, 'ffprobe-a', 'echo ffprobe build A') };
      const b = { ffmpeg: await executable(dir, 'ffmpeg-b', 'echo ffmpeg build B'), ffprobe: await executable(dir, 'ffprobe-b', 'echo ffprobe build B') };
      vi.stubEnv('HELIOS_FFMPEG_PATH', a.ffmpeg); vi.stubEnv('HELIOS_FFPROBE_PATH', a.ffprobe);
      const fromEnvA = await new NativeBackend().fingerprint();
      vi.stubEnv('HELIOS_FFMPEG_PATH', b.ffmpeg); vi.stubEnv('HELIOS_FFPROBE_PATH', b.ffprobe);
      const fromEnvB = await new NativeBackend().fingerprint();
      const explicitA = await new NativeBackend({ ffmpeg: a.ffmpeg, ffprobe: a.ffprobe }).fingerprint();
      expect(fromEnvA).not.toBe(fromEnvB);
      expect(explicitA).toBe(fromEnvA);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);

  it('lets CLI --ffmpeg and --ffprobe flags override the environment', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-executables-'));
    try {
      const real = { ffmpeg: resolveMediaExecutable('ffmpeg').path, ffprobe: resolveMediaExecutable('ffprobe').path };
      vi.stubEnv('HELIOS_FFMPEG_PATH', await executable(dir, 'ffmpeg-broken', 'exit 1'));
      vi.stubEnv('HELIOS_FFPROBE_PATH', await executable(dir, 'ffprobe-broken', 'exit 1'));
      const plan = join(dir, 'plan.json'), output = join(dir, 'out.mp4');
      await writeFile(plan, JSON.stringify({ version: 'portable-v1', width: 32, height: 32, fps: { num: 30, den: 1 }, frameCount: 4, nodes: [] }));
      await runCli(['render', plan, '--output', output, '--ffmpeg', real.ffmpeg, '--ffprobe', real.ffprobe]);
      expect(await probeVideo(output, { ffprobe: real.ffprobe })).toMatchObject({ frameCount: 4 });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);
});

describe('video passthrough capability', () => {
  const modern = 'Advanced per-stream options:\n-fps_mode[:<stream_spec>]  set framerate mode for matching video streams\n-vsync              set video sync method globally; deprecated, use -fps_mode\n';
  const legacy = 'Advanced Video options:\n-vsync              video sync method\n-frame_drop_threshold <float>  frame drop threshold\n';

  it('selects -fps_mode passthrough when the help lists it', () => {
    expect(passthroughArgs(modern)).toEqual(['-fps_mode', 'passthrough']);
  });

  it('selects -vsync 0 (passthrough) when the help predates -fps_mode', () => {
    expect(passthroughArgs(legacy)).toEqual(['-vsync', '0']);
  });

  it('probes each binary once and keeps binaries apart', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-passthrough-'));
    try {
      const log = join(dir, 'calls.log');
      const helpFile = (name: string, text: string) => writeFile(join(dir, name), text);
      await helpFile('modern.txt', modern); await helpFile('legacy.txt', legacy);
      const fake = (name: string, help: string) => executable(dir, name, `echo "$*" >> '${log}'\nif [ "$1" = "-version" ]; then echo "${name} version"; else cat '${join(dir, help)}'; fi`);
      const newer = await fake('ffmpeg-new', 'modern.txt'), older = await fake('ffmpeg-old', 'legacy.txt');
      expect(await videoPassthroughArgs(newer)).toEqual(['-fps_mode', 'passthrough']);
      expect(await videoPassthroughArgs(older)).toEqual(['-vsync', '0']);
      expect(await videoPassthroughArgs(newer)).toEqual(['-fps_mode', 'passthrough']);
      expect(await videoPassthroughArgs(older)).toEqual(['-vsync', '0']);
      const helpCalls = (await readFile(log, 'utf8')).trim().split('\n').filter(line => line.includes('-h full'));
      expect(helpCalls).toHaveLength(2);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
