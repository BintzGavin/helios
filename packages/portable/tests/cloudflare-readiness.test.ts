import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { EventEmitter, once } from 'node:events';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { validateReadinessProbe, runReadinessProbe, readReadinessFailure, BASELINE_HTML_SHA256 } from '../benchmarks/cloudflare/readiness-probe.mjs';

function report() {
  return {
    status: 'qualified', htmlSha256: BASELINE_HTML_SHA256, gpuDevicePresent: false, platform: 'linux', logicalCpus: 4,
    evidenceArchive: { bytes: 1024, sha256: 'd'.repeat(64) },
    outputs: [0, 1].flatMap(round => ['fixed-delay', 'ready'].map(mode => ({ round, mode, renderMs: 1000, verificationMs: 100, width: 1280, height: 720, fps: '24/1', duration: 10, codec: 'h264', pixelFormat: 'yuv420p', frameHashes: Array(240).fill('a'.repeat(64)), motionVerifiedFrames: 240, videoSha256: 'b'.repeat(64) }))),
  };
}

it('accepts all paired outputs with exactly equal pixels and complete software-encoded videos', () => {
  expect(validateReadinessProbe(report()).outputs).toHaveLength(4);
});

it('rejects a missed final frame or changed decoded pixels', () => {
  const incomplete = report(); incomplete.outputs[0].frameHashes.pop();
  expect(() => validateReadinessProbe(incomplete)).toThrow();
  const truncated = report(); truncated.outputs.forEach(output => output.frameHashes.pop());
  expect(() => validateReadinessProbe(truncated)).toThrow();
  const changed = report(); changed.outputs[3].frameHashes[239] = 'c'.repeat(64);
  expect(() => validateReadinessProbe(changed)).toThrow('changed decoded pixels');
});

it('rejects duplicate pairs, invalid render times and altered cadence', () => {
  const duplicate = report(); duplicate.outputs[3] = duplicate.outputs[2];
  expect(() => validateReadinessProbe(duplicate)).toThrow();
  const timing = report(); timing.outputs[1].renderMs = NaN;
  expect(() => validateReadinessProbe(timing)).toThrow();
  const cadence = report(); cadence.outputs[1].fps = '30/1';
  expect(() => validateReadinessProbe(cadence)).toThrow();
});

it('refuses invalid inputs and changed baseline HTML before creating a container', async () => {
  let created = 0;
  const deps = { loadHtml: async () => new Uint8Array([1]), createSandbox: async () => { created++; } };
  await expect(runReadinessProbe({ runId: '../escape' }, deps)).rejects.toThrow();
  await expect(runReadinessProbe({ runId: 'valid-id' }, deps)).rejects.toThrow('Baseline HTML changed');
  expect(created).toBe(0);
});

it('publishes only after artifact transfer and cleanup; failed transfer withholds success', async () => {
  const events: string[] = [];
  const sandbox = { async readFile() { return { success: true, content: JSON.stringify(report()) }; }, async destroy() { events.push('destroy'); } };
  const deps = {
    loadHtml: () => readFile(new URL('../benchmarks/cloudflare/fixtures/scheduler-square.html', import.meta.url)),
    createSandbox: async () => sandbox,
    execute: async () => { events.push('execute'); },
    transfer: async () => { events.push('transfer'); },
    publish: async () => { events.push('publish'); },
  };
  await runReadinessProbe({ runId: 'ready-probe' }, deps);
  expect(events).toEqual(['execute', 'transfer', 'destroy', 'publish']);
  events.length = 0;
  await expect(runReadinessProbe({ runId: 'failed-probe' }, { ...deps, transfer: async () => { throw new Error('failed'); } })).rejects.toThrow();
  expect(events).toEqual(['execute', 'destroy']);
});

it('cleans up failed rendering and rejects oversized evidence before upload', async () => {
  let destroyed = 0; let transferred = 0;
  const deps = {
    loadHtml: () => readFile(new URL('../benchmarks/cloudflare/fixtures/scheduler-square.html', import.meta.url)),
    createSandbox: async () => ({ async readFile() { return { success: true, content: 'x'.repeat(128 * 1024 + 1) }; }, async destroy() { destroyed++; } }),
    execute: async () => {}, transfer: async () => { transferred++; }, publish: async () => { throw new Error('Must not publish'); },
  };
  await expect(runReadinessProbe({ runId: 'oversized' }, deps)).rejects.toThrow();
  await expect(runReadinessProbe({ runId: 'execute-failed' }, { ...deps, execute: async () => { throw new Error('failed'); } })).rejects.toThrow();
  expect(destroyed).toBe(2); expect(transferred).toBe(0);
});

it('keeps bounded controlled failure evidence before destroying a failed container', async () => {
  const events: string[] = [];
  let failure: unknown;
  const sandbox = {
    readFile: async () => ({ success: true, content: JSON.stringify({ stage: 'verification', category: 'motion-mismatch', round: 0, mode: 'fixed-delay', exitCode: 1, arbitraryOutput: 'must be discarded' }) }),
    destroy: async () => { events.push('destroy'); },
  };
  await expect(runReadinessProbe({ runId: 'failed-render' }, {
    loadHtml: () => readFile(new URL('../benchmarks/cloudflare/fixtures/scheduler-square.html', import.meta.url)),
    createSandbox: async () => sandbox,
    execute: async () => { throw new Error('arbitrary SDK exception'); },
    onFailed: async (value: unknown) => { failure = value; events.push('failure'); },
  })).rejects.toThrow();
  expect(events).toEqual(['failure', 'destroy']);
  expect(failure).toEqual({ status: 'failed', stage: 'verification', category: 'motion-mismatch', round: 0, mode: 'fixed-delay', exitCode: 1 });
});

it('rejects arbitrary or oversized diagnostic values without copying them', async () => {
  const unknown = { status: 'failed', stage: 'unknown', category: 'unknown', round: null, mode: null, exitCode: null };
  expect(await readReadinessFailure({ readFile: async () => ({ success: true, content: JSON.stringify({ stage: 'untrusted stage', category: 'arbitrary error', round: 5, mode: 'untrusted mode', exitCode: 'bad' }) }) })).toEqual(unknown);
  expect(await readReadinessFailure({ readFile: async () => ({ success: true, content: 'x'.repeat(4097) }) })).toEqual(unknown);
  expect(await readReadinessFailure({ readFile: async () => { throw new Error('SDK failure'); } })).toEqual(unknown);
});

it('the real container program records a failed command before exiting', async () => {
  const source = await readFile(new URL('../benchmarks/cloudflare/readiness-container.cjs.txt', import.meta.url), 'utf8');
  const html = await readFile(new URL('../benchmarks/cloudflare/fixtures/scheduler-square.html', import.meta.url));
  let resolveFailure!: (value: unknown) => void;
  const saved = new Promise<unknown>(resolve => { resolveFailure = resolve; });
  const modules: Record<string, unknown> = {
    'node:fs/promises': {
      readFile: async () => html, mkdir: async () => {},
      writeFile: async (path: string, content: string) => { if (path.endsWith('readiness-failure.json')) resolveFailure(JSON.parse(content)); },
    },
    'node:child_process': { spawn: () => { const child = new EventEmitter(); queueMicrotask(() => child.emit('exit', 127)); return child; } },
    'node:crypto': { createHash }, 'node:events': { once }, 'node:perf_hooks': { performance },
    'node:fs': { existsSync: () => false }, 'node:os': {},
  };
  runInNewContext(source, { require: (name: string) => modules[name], process: { exitCode: 0 }, console: { error() {} } });
  expect(await saved).toEqual({ stage: 'render', round: 0, mode: 'fixed-delay', exitCode: 127, category: 'command-failed' });
});
