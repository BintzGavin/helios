import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { runRemoteBenchmark } from '../benchmarks/cloudflare/run-remote.mjs';

function fixture() {
  const bytes = new TextEncoder().encode('a source capsule');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const input = { runId: 'qualification-01', capsuleSha256: sha256, workers: 2, encoderThreads: 1, repeats: 1 };
  const events: string[] = [];
  const report = { status: 'qualified', workload: { frames: 300, width: 1920, height: 1080, fps: 30 }, qualifiedOutputs: 4, sourcePin: 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b' };
  let time = 0;
  const sandbox = {
    async writeFile(path: string) { events.push(`write:${path}`); return { success: true }; },
    async exec(command: string) { events.push(`exec:${command}`); return { success: true, exitCode: 0 }; },
    async readFile(path?: string) { return { success: true, content: JSON.stringify(path?.endsWith('protocol-version.json') ? { checkpointedRounds: true } : report) }; },
    async destroy() { events.push('destroy'); },
  };
  const deps = {
    now: () => ++time,
    async loadCapsule(key: string) { events.push(`load:${key}`); return bytes; },
    async createSandbox(id: string) { events.push(`create:${id}`); return sandbox; },
    async publishCandidate(key: string, report: any) { events.push(`candidate:${key}`); expect(report.status).toBe('artifacts-pending'); },
    async publishArtifacts(key: string) { events.push(`artifacts:${key}`); },
    async publishReport(key: string) { events.push(`report:${key}`); },
  };
  return { input, deps, events, sandbox, report };
}

describe('remote CPU benchmark qualification', () => {
  it('captures bounded failure evidence before cleanup without publishing success', async () => {
    const f = fixture();
    f.sandbox.exec = async command => ({ success: !command.endsWith('prepare.py'), exitCode: command.endsWith('prepare.py') ? 1 : 0 });
    await expect(runRemoteBenchmark(f.input, { ...f.deps, inspectFailure: async () => { f.events.push('inspect-failure'); } })).rejects.toThrow('phase failed');
    expect(f.events.indexOf('inspect-failure')).toBeGreaterThan(-1);
    expect(f.events.indexOf('inspect-failure')).toBeLessThan(f.events.indexOf('destroy'));
    expect(f.events.some(value => value.startsWith('report:'))).toBe(false);
  });

  it('reacquires opaque container clients in each durable step without restarting the container', async () => {
    const f = fixture();
    let scope = 0;
    let created = 0;
    const client = () => {
      const ownedScope = scope;
      const guard = () => { if (scope !== ownedScope) throw new Error('Client crossed durable-step scope'); };
      return {
        writeFile: async (...args: any[]) => { guard(); return f.sandbox.writeFile(args[0]); },
        exec: async (command: string) => { guard(); return f.sandbox.exec(command); },
        readFile: async (path: string) => { guard(); return f.sandbox.readFile(path); },
        destroy: async () => { guard(); return f.sandbox.destroy(); },
      };
    };
    const deps = { ...f.deps,
      checkpoint: async (_name: string, action: () => Promise<unknown>) => { scope++; return action(); },
      createSandbox: async () => { created++; return client(); },
      getSandbox: async () => client(),
    };
    await expect(runRemoteBenchmark(f.input, deps)).resolves.toMatchObject({ status: 'qualified' });
    expect(created).toBe(1);
  });

  it('emits one completion only after published evidence and cleanup, including replay', async () => {
    const f = fixture();
    const saved = new Map<string, unknown>();
    let completions = 0;
    const deps = { ...f.deps,
      checkpoint: async (name: string, action: () => Promise<unknown>) => {
        if (!saved.has(name)) saved.set(name, await action());
        return saved.get(name);
      },
      onQualified: async (value: any) => { completions++; expect(value.status).toBe('qualified'); f.events.push('completion'); },
    };
    await runRemoteBenchmark(f.input, deps);
    expect(f.events.indexOf('completion')).toBeGreaterThan(f.events.indexOf('destroy'));
    expect(f.events.indexOf('completion')).toBeGreaterThan(f.events.findIndex(value => value.startsWith('report:')));
    await runRemoteBenchmark(f.input, deps);
    expect(completions).toBe(1);
  });

  it.each([
    { runId: '../someone-else' }, { runId: 'UPPERCASE' }, { runId: undefined }, { runId: 42 }, { capsuleSha256: 'invalid' },
    { workers: 0 }, { workers: 5 }, { encoderThreads: 0 }, { encoderThreads: 8 }, { repeats: 0 }, { repeats: 6 },
  ])('rejects invalid operator input before storage or container work: %j', async (override) => {
    const f = fixture();
    await expect(runRemoteBenchmark({ ...f.input, ...override }, f.deps)).rejects.toThrow();
    expect(f.events).toEqual([]);
  });

  it('rejects a capsule digest mismatch before creating a sandbox', async () => {
    const f = fixture();
    f.deps.loadCapsule = async () => new Uint8Array([42]);
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('digest');
    expect(f.events).toEqual([]);
  });

  it('rejects an oversized capsule before creating a sandbox', async () => {
    const f = fixture();
    f.deps.loadCapsule = async () => new Uint8Array(8 * 1024 * 1024 + 1);
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('size');
    expect(f.events).toEqual([]);
  });

  it('qualifies the fixed workload, publishes artifacts before its report, and cleans up', async () => {
    const f = fixture();
    const result = await runRemoteBenchmark(f.input, f.deps);
    expect(result.status).toBe('qualified');
    expect(Object.keys(result.phaseMs)).toEqual(['staging', 'preparation', 'pairedRendering', 'quality', 'artifactTransfer']);
    expect(Object.values(result.phaseMs).every(value => typeof value === 'number' && value >= 0)).toBe(true);
    const publish = f.events.filter(value => value.startsWith('artifacts:') || value.startsWith('report:'));
    expect(publish).toEqual(['artifacts:benchmarks/helios-cpu/qualification-01/evidence.tar.gz', 'report:benchmarks/helios-cpu/qualification-01/result.json']);
    expect(f.events.indexOf('destroy')).toBeLessThan(f.events.indexOf('report:benchmarks/helios-cpu/qualification-01/result.json'));
    expect(f.events.indexOf('destroy')).toBeGreaterThan(f.events.indexOf('artifacts:benchmarks/helios-cpu/qualification-01/evidence.tar.gz'));
  });

  it.each(['prepare.py', 'compare.py', 'qualify.py'])('rejects a failed %s phase without publication and cleans up', async (phase) => {
    const f = fixture();
    f.sandbox.exec = async command => ({ success: !command.endsWith(phase), exitCode: command.endsWith(phase) ? 1 : 0 });
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('failed');
    expect(f.events.some(value => value.startsWith('artifacts:') || value.startsWith('report:'))).toBe(false);
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('can bootstrap a scheduler image without a preinstalled Python interpreter', async () => {
    const f = fixture();
    let pythonInstalled = false;
    f.sandbox.exec = async command => {
      if (command.includes('apt-get install') && command.includes('python3')) pythonInstalled = true;
      const success = !command.includes('python3 /workspace/') || pythonInstalled;
      return { success, exitCode: success ? 0 : 127 };
    };
    await expect(runRemoteBenchmark(f.input, f.deps)).resolves.toMatchObject({ status: 'qualified' });
  });

  it('rejects incomplete quality qualification without publishing and cleans up', async () => {
    const f = fixture();
    f.report.qualifiedOutputs = 3;
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('qualification');
    expect(f.events.some(value => value.startsWith('artifacts:') || value.startsWith('report:'))).toBe(false);
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('rejects the wrong workload despite a claimed qualified status', async () => {
    const f = fixture();
    f.report.workload.frames = 299;
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('workload');
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('retains candidate evidence before a failed large-artifact transfer', async () => {
    const f = fixture(); f.deps.publishArtifacts = async () => { throw new Error('transfer failed'); };
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('transfer failed');
    expect(f.events).toContain('candidate:benchmarks/helios-cpu/qualification-01/candidate.json');
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('does not publish a successful report when artifact transfer fails', async () => {
    const f = fixture();
    let completions = 0;
    f.deps.publishArtifacts = async () => { throw new Error('transfer failed'); };
    await expect(runRemoteBenchmark(f.input, { ...f.deps, onQualified: async () => { completions++; } })).rejects.toThrow('transfer failed');
    expect(f.events.some(value => value.startsWith('report:'))).toBe(false);
    expect(completions).toBe(0);
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('does not publish a successful report when sandbox cleanup fails', async () => {
    const f = fixture();
    f.sandbox.destroy = async () => { throw new Error('cleanup failed'); };
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow('cleanup failed');
    expect(f.events.some(value => value.startsWith('report:'))).toBe(false);
  });

  it('checkpoints individual rounds and replays completed phases without repeating I/O', async () => {
    const f = fixture(); f.input.repeats = 3; f.report.qualifiedOutputs = 12;
    const saved = new Map<string, unknown>();
    const deps = { ...f.deps, rounds: true, getSandbox: async () => f.sandbox,
      checkpoint: async (name: string, action: () => Promise<unknown>) => {
        if (!saved.has(name)) saved.set(name, await action());
        return saved.get(name);
      },
    };
    const first = await runRemoteBenchmark(f.input, deps);
    expect([...saved.keys()]).toEqual(['capsule', 'staging', 'preparation', 'paired-round-0', 'paired-round-1', 'paired-round-2', 'quality', 'candidate', 'artifact-transfer', 'cleanup', 'publication']);
    expect(f.events.filter(value => value.includes('/compare.py '))).toHaveLength(3);
    const count = f.events.length;
    const replayed = await runRemoteBenchmark(f.input, deps);
    expect(f.events).toHaveLength(count);
    expect(replayed).toEqual(first);
  });

  it('boots a newly owned cold sandbox only during staging', async () => {
    const f = fixture(); let booted = false;
    Object.assign(f.sandbox, { getState: async () => ({ status: booted ? 'healthy' : 'stopped' }) });
    const exec = f.sandbox.exec;
    f.sandbox.exec = async command => { booted = true; return exec(command); };
    await expect(runRemoteBenchmark(f.input, f.deps)).resolves.toMatchObject({ status: 'qualified' });
    expect(booted).toBe(true);
  });

  it('rejects a legacy capsule before compiling when checkpointed rounds are requested', async () => {
    const f = fixture(); f.sandbox.readFile = async () => ({ success: true, content: '{}' });
    await expect(runRemoteBenchmark(f.input, { ...f.deps, rounds: true })).rejects.toThrow('checkpointed round support');
    expect(f.events.some(value => value.includes('/prepare.py') || value.includes('/compare.py'))).toBe(false);
    expect(f.events.at(-1)).toBe('destroy');
  });

  it('refuses to restart a stopped prepared sandbox and still cleans up its ownership', async () => {
    const f = fixture(); let prepared = false;
    Object.assign(f.sandbox, { getState: async () => ({ status: prepared ? 'stopped' : 'healthy' }) });
    const exec = f.sandbox.exec;
    f.sandbox.exec = async command => { const result = await exec(command); if (command.endsWith('prepare.py')) prepared = true; return result; };
    await expect(runRemoteBenchmark(f.input, f.deps)).rejects.toThrow();
    expect(f.events.some(value => value.startsWith('report:'))).toBe(false);
    expect(f.events.at(-1)).toBe('destroy');
  });
});
