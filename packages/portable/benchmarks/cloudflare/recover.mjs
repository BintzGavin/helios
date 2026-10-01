export async function recoverBenchmark(input, deps) {
  for (const id of [input?.runId, input?.targetRunId]) if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)) throw new Error('Invalid recovery identifier');
  if (input.runId === input.targetRunId) throw new Error('Recovery must preserve the original namespace');
  const sandbox = await deps.getSandbox(`helios-cpu-${input.targetRunId}`);
  if ((await sandbox.getState()).status !== 'healthy') throw new Error('Recovery source container is stopped or unavailable');
  const started = deps.now();
  let result;
  try {
    await deps.inspect(sandbox);
    const file = await sandbox.readFile('/workspace/helios-cpu/qualification.json');
    if (!file.success || file.content.length > 1024 * 1024) throw new Error('Missing bounded recovery report');
    const report = JSON.parse(file.content);
    if (report.status !== 'qualified' || !Number.isInteger(report.qualifiedOutputs) || report.qualifiedOutputs < 4) throw new Error('Recovery source was not qualified');
    await deps.candidate(`benchmarks/helios-cpu/${input.runId}/candidate.json`, { ...report, status: 'artifacts-pending', originRunId: input.targetRunId });
    await deps.transfer(`benchmarks/helios-cpu/${input.runId}/evidence.tar.gz`, sandbox);
    result = { ...report, runId: input.runId, originRunId: input.targetRunId, recoveryMs: deps.now() - started, boundary: 'Original paired render timers recovered unchanged; recovery cost excludes original compilation and rendering.' };
  } finally {
    await sandbox.destroy();
  }
  await deps.publish(`benchmarks/helios-cpu/${input.runId}/result.json`, result);
  await deps.onRecovered?.(result);
  return result;
}
