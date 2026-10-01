export async function runTransferProbe(input, deps) {
  if (typeof input?.runId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId) || !Number.isInteger(input.megabytes) || input.megabytes < 1 || input.megabytes > 256) throw new Error('Invalid transfer probe');
  const sandbox = await deps.createSandbox(`helios-transfer-${input.runId}`);
  let result;
  try {
    const execute = async command => {
      const response = await sandbox.exec(command, { timeout: 5 * 60 * 1000, env: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' } });
      if (!response.success || response.exitCode !== 0) throw new Error('Transfer probe preparation failed');
    };
    await execute('/usr/bin/mkdir -p /workspace/helios-cpu && /usr/bin/apt-get update && /usr/bin/apt-get install -y --no-install-recommends python3');
    const script = `import hashlib, json, pathlib, random
root = pathlib.Path('/workspace/helios-cpu')
generator = random.Random(7300)
checksum = hashlib.sha256()
with (root / 'artifact-probe.bin').open('wb') as output:
    for index in range(${input.megabytes}):
        chunk = generator.randbytes(1024 * 1024)
        checksum.update(chunk)
        output.write(chunk)
(root / 'artifact-probe.json').write_text(json.dumps({'bytes': ${input.megabytes} * 1024 * 1024, 'sha256': checksum.hexdigest()}))
`;
    const write = await sandbox.writeFile('/workspace/helios-cpu/artifact-probe.py', script);
    if (!write.success) throw new Error('Transfer probe staging failed');
    await execute('/usr/bin/python3 /workspace/helios-cpu/artifact-probe.py');
    const file = await sandbox.readFile('/workspace/helios-cpu/artifact-probe.json');
    if (!file.success || file.content.length > 1024) throw new Error('Missing transfer probe metadata');
    const metadata = JSON.parse(file.content);
    if (metadata.bytes !== input.megabytes * 1024 * 1024 || typeof metadata.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(metadata.sha256)) throw new Error('Invalid transfer probe metadata');
    const started = deps.now();
    await deps.transfer(`benchmarks/helios-cpu/${input.runId}/artifact-probe.bin`, sandbox);
    result = { status: 'transferred', runId: input.runId, ...metadata, transferMs: deps.now() - started, verification: 'Retrieve the object and compare SHA256 before asserting byte-preserving transfer.' };
  } finally {
    await sandbox.destroy();
  }
  await deps.publish(`benchmarks/helios-cpu/${input.runId}/result.json`, result);
  await deps.onTransferred?.(result);
  return result;
}
