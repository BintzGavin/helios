/** Finite inactivity limits still allow compiler commands to finish after a Worker failure. */
export async function initializeOwnedSandbox(sandbox, sleepAfter) {
  try {
    await sandbox.setSleepAfter(sleepAfter);
    await sandbox.setKeepAlive(false);
    return sandbox;
  } catch {
    await sandbox.destroy();
    throw new Error('Owned benchmark sandbox initialization failed');
  }
}
