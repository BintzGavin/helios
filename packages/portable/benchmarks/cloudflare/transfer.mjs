/** Binary HTTP stays on the private Durable Object connection; no port is exposed publicly. */
export async function publishArchive(key, sandbox, store, filename = 'evidence.tar.gz', onOperation = () => {}) {
  if (!['evidence.tar.gz', 'artifact-probe.bin'].includes(filename)) throw new Error('Invalid benchmark artifact');
  await onOperation('artifact-server-start');
  const server = await sandbox.startProcess('/usr/bin/python3 -u -m http.server 8765 --bind 0.0.0.0 --directory /workspace/helios-cpu');
  try {
    await server.waitForPort(8765, { mode: 'tcp', timeout: 30000 });
    await onOperation('artifact-stream');
    const response = await sandbox.containerFetch(`http://localhost:8765/${filename}`, { method: 'GET' }, 8765);
    const header = response.headers.get('Content-Length');
    const bytes = header && /^[1-9][0-9]{0,11}$/.test(header) ? Number(header) : NaN;
    if (!response.ok || !response.body || !Number.isSafeInteger(bytes) || bytes > 5 * 1024 ** 3) {
      await response.body?.cancel();
      throw new Error('Invalid benchmark artifact response');
    }
    await store.putBinary(key, response.body, filename.endsWith('.gz') ? 'application/gzip' : 'application/octet-stream', bytes);
    return { bytes };
  } finally {
    await onOperation('artifact-server-stop');
    await server.kill();
  }
}
