export async function resumeCompletedRender(input, deps) {
  for (const id of [input?.runId, input?.targetRunId]) if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(id)) throw new Error('Invalid resume identifier');
  if (input.runId === input.targetRunId || !Number.isInteger(input.repeats) || input.repeats < 1 || input.repeats > 5) throw new Error('Invalid resume scope');
  const render = await deps.checkpoint('wait-existing-render', () => deps.waitExisting(input));
  if (render?.renderComplete !== true || render.outputs !== 4 * input.repeats) throw new Error('Original rendering is incomplete');
  try {
    const quality = await deps.checkpoint('qualify-existing-outputs', () => deps.qualify(input));
    if (quality?.qualityComplete !== true || quality.outputs !== 4 * input.repeats) throw new Error('Original quality did not qualify');
  } catch (error) {
    await deps.checkpoint('cleanup-failed-quality', () => deps.destroy(input));
    throw error;
  }
  const report = await deps.checkpoint('publish-existing-evidence', () => deps.recover(input));
  if (report?.status !== 'qualified' || report.qualifiedOutputs !== 4 * input.repeats) throw new Error('Incomplete resumed qualification');
  return report;
}
