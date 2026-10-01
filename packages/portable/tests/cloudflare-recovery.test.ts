import { expect, it } from 'vitest';
import { recoverBenchmark } from '../benchmarks/cloudflare/recover.mjs';
function fixture() {
  const events: string[] = [];
  const sandbox = { async getState() { return { status: 'healthy' }; }, async readFile() { return { success: true, content: JSON.stringify({ status: 'qualified', qualifiedOutputs: 4 }) }; }, async destroy() { events.push('destroy'); } };
  const deps = { now: () => 1, async getSandbox() { events.push('get'); return sandbox; }, async inspect() { events.push('inspect'); }, async candidate() { events.push('candidate'); }, async transfer() { events.push('transfer'); }, async publish() { events.push('publish'); } };
  return { events, sandbox, deps };
}
it('recovers existing evidence and publishes only after transfer and cleanup', async () => {
  const f = fixture(); const result = await recoverBenchmark({ runId: 'recovered-01', targetRunId: 'qualification-01' }, f.deps);
  expect(result.originRunId).toBe('qualification-01'); expect(f.events).toEqual(['get', 'inspect', 'candidate', 'transfer', 'destroy', 'publish']);
});
it('does not start or inspect a stopped source container', async () => {
  const f = fixture(); f.sandbox.getState = async () => ({ status: 'stopped' });
  await expect(recoverBenchmark({ runId: 'recovered-01', targetRunId: 'qualification-01' }, f.deps)).rejects.toThrow('stopped'); expect(f.events).toEqual(['get']);
});
it('preserves candidate evidence but withholds success after transfer failure', async () => {
  const f = fixture(); f.deps.transfer = async () => { throw new Error('transfer failed'); };
  await expect(recoverBenchmark({ runId: 'recovered-01', targetRunId: 'qualification-01' }, f.deps)).rejects.toThrow('transfer failed'); expect(f.events).toContain('candidate'); expect(f.events.at(-1)).toBe('destroy'); expect(f.events).not.toContain('publish');
});
