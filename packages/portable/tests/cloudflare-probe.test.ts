import { expect, it } from 'vitest';
import { runTransferProbe } from '../benchmarks/cloudflare/probe.mjs';
function fixture() {
  const events: string[] = []; const report = { bytes: 64 * 1024 * 1024, sha256: 'a'.repeat(64) };
  const sandbox = {
    async exec() { events.push('exec'); return { success: true, exitCode: 0 }; },
    async writeFile() { return { success: true }; },
    async readFile() { return { success: true, content: JSON.stringify(report) }; },
    async destroy() { events.push('destroy'); },
  };
  const deps = { now: () => 1, async createSandbox() { return sandbox; }, async transfer() { events.push('transfer'); }, async publish() { events.push('publish'); }, onTransferred() { events.push('notify'); } };
  return { events, report, sandbox, deps };
}
it('transfers a bounded synthetic artifact, destroys its sandbox and then publishes metadata', async () => {
  const f = fixture(); await expect(runTransferProbe({ runId: 'transfer-01', megabytes: 64 }, f.deps)).resolves.toMatchObject({ status: 'transferred', bytes: 64 * 1024 * 1024 });
  expect(f.events.slice(-4)).toEqual(['transfer', 'destroy', 'publish', 'notify']);
});
it('rejects excessive resource requests before creating a sandbox', async () => {
  const f = fixture(); await expect(runTransferProbe({ runId: 'transfer-01', megabytes: 1024 }, f.deps)).rejects.toThrow(); expect(f.events).toEqual([]);
});
it('cleans up after transfer failure without a success report', async () => {
  const f = fixture(); f.deps.transfer = async () => { throw new Error('transfer failed'); };
  await expect(runTransferProbe({ runId: 'transfer-01', megabytes: 64 }, f.deps)).rejects.toThrow('transfer failed'); expect(f.events.at(-1)).toBe('destroy'); expect(f.events).not.toContain('publish');
});
