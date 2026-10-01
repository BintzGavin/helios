const TERMINAL = ['workflow_completed', 'workflow_errored', 'workflow_terminated'];

/** Wait on the platform's completion primitive; never poll or retain arbitrary event payloads. */
export async function observeTerminal(runId, deps) {
  if (typeof runId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(runId)) throw new Error('Invalid run identifier');
  const instance = await deps.getInstance(runId);
  const subscription = await instance.subscribe({ filter: TERMINAL });
  try {
    const event = await subscription.next();
    const value = event.value;
    if (event.done || !value || value.instanceId !== runId || !TERMINAL.includes(value.type) || !Number.isSafeInteger(value.eventId) || value.eventId < 0 || !Number.isSafeInteger(value.timestamp) || value.timestamp < 0) throw new Error('Invalid terminal event');
    const receipt = { instanceId: runId, type: value.type, eventId: value.eventId, timestamp: value.timestamp };
    await deps.publish(receipt);
    deps.onTerminal(receipt);
    return receipt;
  } finally {
    subscription[Symbol.dispose]();
  }
}
