const SOURCE_PIN = 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b';
const MAX_CAPSULE_BYTES = 8 * 1024 * 1024;
const BOOTSTRAP = `import pathlib, tarfile
root = pathlib.Path('/workspace/helios-cpu')
root.mkdir(exist_ok=True)
with tarfile.open('/workspace/helios-cpu-capsule.tgz', 'r:gz') as archive:
    members = archive.getmembers()
    if sum(member.size for member in members) > 32 * 1024 * 1024:
        raise ValueError('Capsule extraction limit exceeded')
    for member in members:
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not (member.isfile() or member.isdir()):
            raise ValueError('Invalid capsule member')
    archive.extractall(root, members=members)
`;

function validate(input) {
  if (!input || typeof input.runId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) throw new Error('Invalid run identifier');
  if (typeof input.capsuleSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(input.capsuleSha256)) throw new Error('Invalid capsule digest');
  if (!Number.isInteger(input.workers) || input.workers < 1 || input.workers > 4) throw new Error('Invalid worker count');
  if (!Number.isInteger(input.encoderThreads) || input.encoderThreads < 1 || input.encoderThreads > 2) throw new Error('Invalid encoder thread count');
  if (!Number.isInteger(input.repeats) || input.repeats < 1 || input.repeats > 5) throw new Error('Invalid repeat count');
  if (input.evidenceRetention !== undefined && !['full', 'compact'].includes(input.evidenceRetention)) throw new Error('Invalid evidence retention');
}

function base64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

/** Operator-only benchmark orchestration. Dependencies are opaque resource bindings, never credentials. */
export async function runRemoteBenchmark(input, deps) {
  validate(input);
  const prefix = `benchmarks/helios-cpu/${input.runId}`;
  const id = `helios-cpu-${input.runId}`;
  let sandbox;
  const checkpoint = (name, action) => (deps.checkpoint ?? ((_name, callback) => callback()))(name, async () => {
    if (deps.getSandbox && !['capsule', 'staging'].includes(name)) sandbox = undefined;
    return action();
  });
  const phaseMs = {};
  let bytes;
  const capsule = await checkpoint('capsule', async () => {
    bytes = await deps.loadCapsule(`benchmarks/helios-cpu/capsules/${input.capsuleSha256}.tgz`);
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_CAPSULE_BYTES) throw new Error('Invalid capsule size');
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (digest !== input.capsuleSha256) throw new Error('Capsule digest mismatch');
    return { digest };
  });
  let owned = false;
  let initialBoot = false;
  const getLive = async () => {
    sandbox ??= await deps.getSandbox?.(id);
    if (!sandbox) throw new Error('Missing staged benchmark sandbox');
    if (!initialBoot && sandbox.getState && (await sandbox.getState()).status !== 'healthy') throw new Error('Benchmark sandbox stopped; refusing to restart');
    return sandbox;
  };
  const write = async (path, content, options) => {
    await deps.onOperation?.(`write:${path.split('/').at(-1)}`);
    const response = await (await getLive()).writeFile(path, content, options);
    if (!response.success) {
      await deps.onFailure?.({ responseSuccessType: typeof response.success, exitCode: Number.isInteger(response.exitCode) ? response.exitCode : null });
      throw new Error('Benchmark staging failed');
    }
  };
  const execute = async (command, label = command.split('/').at(-1)) => {
    await deps.onOperation?.(`execute:${label}`);
    const response = await (await getLive()).exec(command, { timeout: 28 * 60 * 1000, env: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', RUSTC: '/root/.cargo/bin/rustc' } });
    if (!response.success || response.exitCode !== 0) {
      const category = command.endsWith('helios-cpu-bootstrap.py')
        ? ['not a gzip file', 'Invalid capsule member', 'Capsule extraction limit exceeded', 'SyntaxError', 'No such file'].find(marker => response.stderr?.includes(marker)) ?? 'unclassified'
        : 'unclassified';
      await deps.onFailure?.({ responseSuccessType: typeof response.success, exitCode: Number.isInteger(response.exitCode) ? response.exitCode : null, category });
      throw new Error('Benchmark phase failed');
    }
  };
  let report;
  try {
    phaseMs.staging = await checkpoint('staging', async () => {
      const started = deps.now();
      // Replay uses persisted metadata; source bytes are loaded only if this step must run.
      bytes ??= await deps.loadCapsule(`benchmarks/helios-cpu/capsules/${capsule.digest}.tgz`);
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (digest !== capsule.digest || bytes.length > MAX_CAPSULE_BYTES) throw new Error('Staged capsule changed');
      sandbox = await deps.createSandbox(id);
      owned = true;
      initialBoot = true;
      try {
        await deps.onPhase?.('staging');
        await execute('/usr/bin/apt-get update && /usr/bin/apt-get install -y --no-install-recommends python3', 'install-interpreter');
        await write('/workspace/helios-cpu-capsule.tgz', base64(bytes), { encoding: 'base64' });
        await write('/workspace/helios-cpu-bootstrap.py', BOOTSTRAP);
        await execute('python3 /workspace/helios-cpu-bootstrap.py');
        if (deps.rounds || input.evidenceRetention === 'compact') {
          const file = await sandbox.readFile('/workspace/helios-cpu/protocol-version.json');
          if (!file.success || file.content.length > 4096) throw new Error('Missing capsule protocol');
          const protocol = JSON.parse(file.content);
          if (deps.rounds && protocol.checkpointedRounds !== true) throw new Error('Capsule lacks checkpointed round support');
          if (input.evidenceRetention === 'compact' && protocol.compactRetention !== true) throw new Error('Capsule lacks compact retention support');
        }
        await write('/workspace/helios-cpu/input.json', JSON.stringify({ workers: input.workers, encoderThreads: input.encoderThreads, repeats: input.repeats, ...(input.evidenceRetention !== undefined ? { evidenceRetention: input.evidenceRetention } : {}) }));
      } finally {
        initialBoot = false;
      }
      return deps.now() - started;
    });
    owned = true;
    phaseMs.preparation = await checkpoint('preparation', async () => {
      await deps.onPhase?.('preparation'); const started = deps.now();
      await execute('python3 /workspace/helios-cpu/prepare.py');
      return deps.now() - started;
    });
    phaseMs.pairedRendering = 0;
    for (let round = 0; round < (deps.rounds ? input.repeats : 1); round++) {
      phaseMs.pairedRendering += await checkpoint(deps.rounds ? `paired-round-${round}` : 'paired-rendering', async () => {
        await deps.onPhase?.('pairedRendering'); const started = deps.now();
        await execute(`python3 /workspace/helios-cpu/compare.py${deps.rounds ? ` ${round}` : ''}`, 'compare.py');
        return deps.now() - started;
      });
    }
    const quality = await checkpoint('quality', async () => {
      await deps.onPhase?.('quality'); const started = deps.now();
      await execute('python3 /workspace/helios-cpu/qualify.py');
      await deps.onOperation?.('read:qualification');
      const file = await (await getLive()).readFile('/workspace/helios-cpu/qualification.json');
      if (!file.success || file.content.length > 1024 * 1024) throw new Error('Missing bounded qualification report');
      const qualified = JSON.parse(file.content);
      if (qualified.status !== 'qualified' || qualified.qualifiedOutputs !== 4 * input.repeats || qualified.sourcePin !== SOURCE_PIN) throw new Error('Incomplete benchmark qualification');
      if (input.evidenceRetention === 'compact' && qualified.evidenceRetention !== 'compact') throw new Error('Mismatched evidence retention');
      const workload = qualified.workload;
      if (!workload || workload.frames !== 300 || workload.width !== 1920 || workload.height !== 1080 || workload.fps !== 30) throw new Error('Mismatched benchmark workload');
      return { report: qualified, milliseconds: deps.now() - started };
    });
    report = quality.report; phaseMs.quality = quality.milliseconds;
    await checkpoint('candidate', async () => {
      await deps.publishCandidate(`${prefix}/candidate.json`, { ...report, status: 'artifacts-pending', runId: input.runId, capsuleSha256: capsule.digest, phaseMs: { ...phaseMs } });
      return true;
    });
    phaseMs.artifactTransfer = await checkpoint('artifact-transfer', async () => {
      const started = deps.now(); await deps.onPhase?.('artifactTransfer');
      await deps.publishArtifacts(`${prefix}/evidence.tar.gz`, await getLive());
      return deps.now() - started;
    });
  } catch (error) {
    await deps.onAborted?.(error);
    if (deps.inspectFailure && (owned || sandbox)) {
      try { await checkpoint('failure-evidence', async () => deps.inspectFailure(await getLive())); }
      catch { /* A stopped container is not restarted to obtain diagnostics. */ }
    }
    throw error;
  } finally {
    if (owned || sandbox) await checkpoint('cleanup', async () => {
      await deps.onOperation?.('cleanup');
      sandbox ??= await deps.getSandbox?.(id);
      if (!sandbox) throw new Error('Missing owned benchmark sandbox for cleanup');
      await sandbox.destroy();
      return true;
    });
  }
  const result = { ...report, runId: input.runId, capsuleSha256: capsule.digest, phaseMs, boundary: 'Authenticated operator workflow using the scheduler Sandbox; preparation and artifact transfer excluded from paired render timers.' };
  await checkpoint('publication', async () => { await deps.publishReport(`${prefix}/result.json`, result); return true; });
  if (deps.onQualified) await checkpoint('terminal', async () => { await deps.onQualified(result); return true; });
  return result;
}
