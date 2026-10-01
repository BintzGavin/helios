import { expect, it } from 'vitest';
import { recoverFailureContext, readPreparationEvidence } from '../benchmarks/cloudflare/diagnostics.mjs';

it('recovers artifact-transfer context when workflow replay resets local variables', async () => {
  const records: Record<string, string> = {
    'phase.json': JSON.stringify({ phase: 'artifactTransfer' }),
    'operation.json': JSON.stringify({ phase: 'artifactTransfer', operation: 'artifact-transfer-failed' }),
  };
  const context = await recoverFailureContext(async name => records[name] ?? null, { phase: 'input-validation', operation: 'validate-input', boundary: {} });
  expect(context).toEqual({ phase: 'artifactTransfer', operation: 'artifact-transfer-failed', boundary: {} });
});
it('retains a captured failure ahead of later cleanup context', async () => {
  const records: Record<string, string> = {
    'failure-detail.json': JSON.stringify({ phase: 'artifactTransfer', operation: 'artifact-transfer-failed', boundary: { category: 'artifact-transfer-failed', exitCode: null } }),
    'operation.json': JSON.stringify({ phase: 'artifactTransfer', operation: 'cleanup' }),
  };
  expect((await recoverFailureContext(async name => records[name] ?? null, { phase: 'input-validation', operation: 'validate-input', boundary: {} })).operation).toBe('artifact-transfer-failed');
});
it('rejects unknown persisted fields and does not copy arbitrary messages', async () => {
  const context = await recoverFailureContext(async () => JSON.stringify({ phase: 'unrecognized', operation: 'arbitrary text', boundary: { message: 'must not copy' } }), { phase: 'input-validation', operation: 'validate-input', boundary: {} });
  expect(context).toEqual({ phase: 'input-validation', operation: 'validate-input', boundary: {} });
});

it('ignores replay defaults when a real phase and operation were persisted', async () => {
  const records: Record<string, string> = {
    'failure-detail.json': JSON.stringify({ phase: 'input-validation', operation: 'validate-input', boundary: {} }),
    'phase.json': JSON.stringify({ phase: 'preparation' }),
    'operation.json': JSON.stringify({ phase: 'preparation', operation: 'execute:prepare.py' }),
  };
  expect(await recoverFailureContext(async name => records[name] ?? null, { phase: 'input-validation', operation: 'validate-input', boundary: {} })).toEqual({ phase: 'preparation', operation: 'execute:prepare.py', boundary: {} });
});

it('retains only numeric preparation stage receipts before cleanup', async () => {
  const evidence = await readPreparationEvidence({ readFile: async (path: string) => ({ success: true, content: JSON.stringify({ exitStatus: path.endsWith('fframes-build.exit.json') ? 1 : 0, seconds: 12.5, arbitraryLog: 'discard this' }) }) });
  expect(evidence.stages).toContainEqual({ stage: 'fframes-build', exitStatus: 1, seconds: 12.5 });
  expect(evidence.stages.every((stage: any) => Object.keys(stage).sort().join(',') === 'exitStatus,seconds,stage')).toBe(true);
});

it('withholds oversized, missing and invalid stage records without retaining SDK errors', async () => {
  expect(await readPreparationEvidence({ readFile: async () => ({ success: true, content: 'x'.repeat(4097) }) })).toEqual({ stages: [] });
  expect(await readPreparationEvidence({ readFile: async () => ({ success: true, content: JSON.stringify({ exitStatus: 'bad', seconds: -1 }) }) })).toEqual({ stages: [] });
  expect(await readPreparationEvidence({ readFile: async () => { throw new Error('arbitrary SDK detail'); } })).toEqual({ stages: [] });
});
