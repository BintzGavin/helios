import { expect, it } from 'vitest';
import { resumeCompletedRender } from '../benchmarks/cloudflare/resume.mjs';

function fixture() {
  const events: string[] = [];
  return { events, deps: {
    checkpoint: async (name: string, action: () => Promise<unknown>) => { events.push(name); return action(); },
    waitExisting: async () => ({ renderComplete: true, outputs: 12 }),
    qualify: async () => ({ qualityComplete: true, outputs: 12 }),
    recover: async () => ({ status: 'qualified', qualifiedOutputs: 12 }),
    destroy: async () => { events.push('destroy'); },
  } };
}
const input = { runId: 'resume-04', targetRunId: 'paired-04', repeats: 3 };

it('persists separate completion, quality and publication steps without compiling or rendering again', async () => {
  const { deps, events } = fixture();
  expect((await resumeCompletedRender(input, deps)).status).toBe('qualified');
  expect(events).toEqual(['wait-existing-render', 'qualify-existing-outputs', 'publish-existing-evidence']);
});
it('preserves a still-running source and refuses qualification without complete render evidence', async () => {
  const { deps, events } = fixture();
  await expect(resumeCompletedRender(input, { ...deps, waitExisting: async () => ({ renderComplete: false, outputs: 8 }) })).rejects.toThrow();
  expect(events).toEqual(['wait-existing-render']);
});
it('cleans up a completed source when quality fails and never publishes success', async () => {
  const { deps, events } = fixture();
  await expect(resumeCompletedRender(input, { ...deps, qualify: async () => { throw new Error('Quality failed'); } })).rejects.toThrow();
  expect(events).toEqual(['wait-existing-render', 'qualify-existing-outputs', 'cleanup-failed-quality', 'destroy']);
});
it('rejects unsafe identifiers, same-source destination and altered repetition counts before I/O', async () => {
  for (const invalid of [{ ...input, runId: '../escape' }, { ...input, runId: input.targetRunId }, { ...input, repeats: 0 }]) {
    const { deps, events } = fixture();
    await expect(resumeCompletedRender(invalid, deps)).rejects.toThrow();
    expect(events).toEqual([]);
  }
});
