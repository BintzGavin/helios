import { WorkflowEntrypoint } from 'cloudflare:workers';
import { getSandbox } from '@cloudflare/sandbox';
import { MemoryStore } from 'scheduler-memory';
import { runRemoteBenchmark } from './run-remote.mjs';
import { observeTerminal } from './observe.mjs';
import { publishArchive } from './transfer.mjs';
import { recoverFailureContext, readPreparationEvidence } from './diagnostics.mjs';
import { runTransferProbe } from './probe.mjs';
import { recoverBenchmark } from './recover.mjs';
import { initializeOwnedSandbox } from './lifecycle.mjs';
import qualificationSource from './qualification.py';
import recoveryInspectionSource from './recovery-inspect.py';
import { runReadinessProbe } from './readiness-probe.mjs';
import readinessContainerSource from './readiness-container.cjs.txt';
import { compositionReadinessScript } from 'scheduler-readiness';
import { resumeCompletedRender } from './resume.mjs';
import resumeCheckSource from './resume-check.py';

/** Authenticated through Cloudflare's workflow API; HTTP requests cannot start jobs. */
export class CpuBenchmarkWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const input = event.payload;
    const store = new MemoryStore(this.env.MEMORY);
    let phase = 'input-validation';
    let operation = 'validate-input';
    let boundary = {};
    try {
        const report = await runRemoteBenchmark(input, {
          checkpoint: (name, action) => step.do(name, { retries: { limit: 0, delay: '1 second' }, timeout: '29 minutes' }, action),
          rounds: true,
          getSandbox: id => getSandbox(this.env.SANDBOX, id, { normalizeId: true }),
          now: () => performance.now(),
          onOperation: async name => {
            operation = name;
            await store.put(`benchmarks/helios-cpu/${input.runId}/${name === 'cleanup' ? 'cleanup' : 'operation'}.json`, JSON.stringify({ phase, operation }));
          },
          onFailure: async detail => {
            boundary = detail;
            await store.put(`benchmarks/helios-cpu/${input.runId}/failure-detail.json`, JSON.stringify({ phase, operation, boundary }));
          },
          onAborted: async () => {
            const recovered = await recoverFailureContext(async name => {
              const object = await this.env.MEMORY.get(`benchmarks/helios-cpu/${input.runId}/${name}`);
              return object && object.size <= 4096 ? object.text() : null;
            }, { phase, operation, boundary });
            await store.put(`benchmarks/helios-cpu/${input.runId}/failure-detail.json`, JSON.stringify(recovered));
          },
          inspectFailure: async sandbox => {
            await store.put(`benchmarks/helios-cpu/${input.runId}/failure-stages.json`, JSON.stringify(await readPreparationEvidence(sandbox)));
          },
          onPhase: async name => {
            phase = name;
            await store.put(`benchmarks/helios-cpu/${input.runId}/phase.json`, JSON.stringify({ phase: name, observedAt: new Date().toISOString() }));
          },
          loadCapsule: async key => {
            const object = await this.env.MEMORY.get(key);
            if (!object || object.size > 8 * 1024 * 1024) throw new Error('Missing bounded source capsule');
            return new Uint8Array(await object.arrayBuffer());
          },
          createSandbox: async id => {
            const sandbox = getSandbox(this.env.SANDBOX, id, { normalizeId: true });
            return initializeOwnedSandbox(sandbox, '90m');
          },
          publishCandidate: async (key, report) => { await store.put(key, JSON.stringify(report)); },
          publishArtifacts: async (key, sandbox) => {
            try {
              await publishArchive(key, sandbox, store, 'evidence.tar.gz', async name => {
                operation = name;
                await store.put(`benchmarks/helios-cpu/${input.runId}/operation.json`, JSON.stringify({ phase, operation }));
              });
            } catch {
              operation = 'artifact-transfer-failed';
              boundary = { category: 'artifact-transfer-failed' };
              throw new Error('Benchmark artifact transfer failed');
            }
          },
          publishReport: async (key, result) => { await store.put(key, JSON.stringify(result)); },
          onQualified: result => console.log('HELIOS_CPU_BENCHMARK_QUALIFIED ' + JSON.stringify({ runId: result.runId, status: result.status, qualifiedOutputs: result.qualifiedOutputs })),
        });
        return { status: report.status, runId: report.runId, qualifiedOutputs: report.qualifiedOutputs, phaseMs: report.phaseMs, prefix: `benchmarks/helios-cpu/${report.runId}` };
    } catch (error) {
      if (typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) {
        const recovered = await recoverFailureContext(async name => {
          const object = await this.env.MEMORY.get(`benchmarks/helios-cpu/${input.runId}/${name}`);
          return object && object.size <= 4096 ? object.text() : null;
        }, { phase, operation, boundary });
        const errorName = ['Error', 'TypeError', 'RangeError', 'FileOperationError', 'CommandExecutionError'].includes(error?.name) ? error.name : 'SDK-boundary-error';
        await store.put(`benchmarks/helios-cpu/${input.runId}/failure.json`, JSON.stringify({ status: 'failed', runId: input.runId, ...recovered, errorName, note: 'Only controlled operation names, numeric exit status and fixed error categories retained.' }));
      }
      console.log('HELIOS_CPU_BENCHMARK_FAILED ' + JSON.stringify({ runId: typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId) ? input.runId : 'invalid' }));
      throw new Error('CPU benchmark did not qualify; inspect scoped phase evidence');
    }
  }
}

/** Separate operator-only workflow waits on the existing benchmark instance. */
export class CpuBenchmarkObserver extends WorkflowEntrypoint {
  async run(event, step) {
    const runId = event.payload?.runId;
    try {
      return await step.do('observe-terminal', { retries: { limit: 0, delay: '1 second' }, timeout: '90 minutes' }, async () => observeTerminal(runId, {
        getInstance: id => this.env.CPU_BENCHMARK.get(id),
        publish: receipt => this.env.MEMORY.put(`benchmarks/helios-cpu/${runId}/terminal-event.json`, JSON.stringify(receipt)),
        onTerminal: receipt => console.log('HELIOS_CPU_TERMINAL ' + JSON.stringify(receipt)),
      }));
    } catch {
      console.log('HELIOS_CPU_OBSERVER_ERROR');
      throw new Error('Benchmark completion subscription failed');
    }
  }
}

/** Small operator-only integration probe de-risks binary publication before compiling again. */
export class CpuBenchmarkTransferProbe extends WorkflowEntrypoint {
  async run(event, step) {
    const input = event.payload;
    try {
      return await step.do('verify-private-binary-path', { retries: { limit: 0, delay: '1 second' }, timeout: '10 minutes' }, async () => runTransferProbe(input, {
        now: () => performance.now(),
        createSandbox: async id => {
          const sandbox = getSandbox(this.env.SANDBOX, id, { normalizeId: true });
          return initializeOwnedSandbox(sandbox, '15m');
        },
        transfer: (key, sandbox) => publishArchive(key, sandbox, new MemoryStore(this.env.MEMORY), 'artifact-probe.bin'),
        publish: (key, result) => this.env.MEMORY.put(key, JSON.stringify(result)),
        onTransferred: result => console.log('HELIOS_CPU_PROBE_TRANSFERRED ' + JSON.stringify(result)),
      }));
    } catch {
      if (typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) {
        await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/failure.json`, JSON.stringify({ status: 'failed', runId: input.runId, category: 'binary-probe-failed' }));
      }
      console.log('HELIOS_CPU_PROBE_FAILED ' + JSON.stringify({ runId: typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId) ? input.runId : 'invalid' }));
      throw new Error('Private binary transfer probe failed');
    }
  }
}

/** Reuses a healthy failed publisher's files; never boots or renders a stopped source. */
export class CpuBenchmarkRecovery extends WorkflowEntrypoint {
  async run(event, step) {
    const input = event.payload;
    try {
      return await step.do('recover-qualified-artifacts', { retries: { limit: 0, delay: '1 second' }, timeout: '10 minutes' }, async () => recoverBenchmark(input, {
        now: () => performance.now(),
        getSandbox: id => getSandbox(this.env.SANDBOX, id, { normalizeId: true }),
        inspect: async sandbox => {
          for (const [name, source] of [['recovery_validator.py', qualificationSource], ['recovery_inspect.py', recoveryInspectionSource]]) {
            if (!(await sandbox.writeFile(`/workspace/helios-cpu/${name}`, source)).success) throw new Error('Recovery inspection staging failed');
          }
          const response = await sandbox.exec('/usr/bin/python3 /workspace/helios-cpu/recovery_inspect.py', { timeout: 5 * 60 * 1000, env: { PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' } });
          if (!response.success || response.exitCode !== 0) throw new Error('Recovery inspection failed');
        },
        candidate: (key, report) => this.env.MEMORY.put(key, JSON.stringify(report)),
        transfer: (key, sandbox) => publishArchive(key, sandbox, new MemoryStore(this.env.MEMORY)),
        publish: (key, report) => this.env.MEMORY.put(key, JSON.stringify(report)),
        onRecovered: report => console.log('HELIOS_CPU_RECOVERY_COMPLETED ' + JSON.stringify({ runId: report.runId, originRunId: report.originRunId, qualifiedOutputs: report.qualifiedOutputs, status: report.status })),
      }));
    } catch {
      if (typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) {
        await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/failure.json`, JSON.stringify({ status: 'failed', runId: input.runId, category: 'recovery-source-unavailable-or-invalid' }));
        console.log('HELIOS_CPU_RECOVERY_FAILED ' + JSON.stringify({ runId: input.runId }));
      }
      throw new Error('Benchmark recovery unavailable; original rendering was not repeated');
    }
  }
}

/** Compares only Vite waiting on the frozen DOM baseline, without creative authoring. */
export class CpuReadinessProbe extends WorkflowEntrypoint {
  async run(event, step) {
    const input = event.payload;
    let failureDetail;
    try {
      return await step.do('qualify-dom-readiness', { retries: { limit: 0, delay: '1 second' }, timeout: '10 minutes' }, async () => runReadinessProbe(input, {
        loadHtml: async () => {
          const object = await this.env.MEMORY.get('videos/video-muny3zr2-yxr6/composition.html');
          if (!object || object.size > 128 * 1024) throw new Error('Missing bounded baseline HTML');
          return new Uint8Array(await object.arrayBuffer());
        },
        createSandbox: id => initializeOwnedSandbox(getSandbox(this.env.SANDBOX, id, { normalizeId: true }), '15m'),
        execute: async (sandbox, html) => {
          const install = await sandbox.exec('/usr/bin/apt-get update && /usr/bin/apt-get install -y --no-install-recommends python3 && mkdir -p /workspace/helios-cpu', { timeout: 120000 });
          if (!install.success || install.exitCode !== 0) throw new Error('DOM probe preparation failed');
          for (const [path, content] of [['/workspace/composition.html', new TextDecoder().decode(html)], ['/workspace/wait-for-vite.cjs', compositionReadinessScript()], ['/workspace/helios-cpu/readiness-container.cjs', readinessContainerSource]]) {
            if (!(await sandbox.writeFile(path, content)).success) throw new Error('DOM probe staging failed');
          }
          const response = await sandbox.exec('node /workspace/helios-cpu/readiness-container.cjs', { timeout: 8 * 60 * 1000 });
          if (!response.success || response.exitCode !== 0) throw new Error('DOM readiness probe failed');
        },
        transfer: (key, sandbox) => publishArchive(key, sandbox, new MemoryStore(this.env.MEMORY)),
        publish: (key, report) => this.env.MEMORY.put(key, JSON.stringify(report)),
        onFailed: async detail => { failureDetail = detail; await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/failure-detail.json`, JSON.stringify(detail)); },
        onQualified: result => console.log('HELIOS_CPU_READINESS_QUALIFIED ' + JSON.stringify(result)),
      }));
    } catch {
      if (typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) {
        await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/failure.json`, JSON.stringify({ status: 'failed', runId: input.runId, category: 'dom-readiness-probe-failed', detail: failureDetail ?? null }));
        console.log('HELIOS_CPU_READINESS_FAILED ' + JSON.stringify({ runId: input.runId }));
      }
      throw new Error('DOM readiness did not qualify');
    }
  }
}

/** Continues a terminal wrapper's retained process/files through bounded durable steps. */
export class CpuBenchmarkResume extends WorkflowEntrypoint {
  async run(event, step) {
    const input = event.payload;
    const source = () => getSandbox(this.env.SANDBOX, `helios-cpu-${input.targetRunId}`, { normalizeId: true });
    const live = async () => {
      const sandbox = source();
      if ((await sandbox.getState()).status !== 'healthy') throw new Error('Original benchmark container unavailable');
      return sandbox;
    };
    try {
      const report = await resumeCompletedRender(input, {
        checkpoint: (name, action) => step.do(name, { retries: { limit: 0, delay: '1 second' }, timeout: '29 minutes' }, action),
        waitExisting: async () => {
          const sandbox = await live();
          if (!(await sandbox.writeFile('/workspace/helios-cpu/resume-check.py', resumeCheckSource)).success) throw new Error('Resume inspection staging failed');
          const response = await sandbox.exec('python3 /workspace/helios-cpu/resume-check.py', { timeout: 25 * 60 * 1000 });
          if (!response.success || response.exitCode !== 0) throw new Error('Original render completion unavailable');
          const file = await sandbox.readFile('/workspace/helios-cpu/resume-state.json');
          if (!file.success || file.content.length > 4096) throw new Error('Missing bounded render receipt');
          return JSON.parse(file.content);
        },
        qualify: async () => {
          const sandbox = await live();
          await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/phase.json`, JSON.stringify({ phase: 'quality' }));
          const response = await sandbox.exec('python3 /workspace/helios-cpu/qualify.py', { timeout: 25 * 60 * 1000 });
          if (!response.success || response.exitCode !== 0) throw new Error('Resumed quality qualification failed');
          const file = await sandbox.readFile('/workspace/helios-cpu/qualification.json');
          if (!file.success || file.content.length > 1024 * 1024) throw new Error('Missing bounded resumed quality report');
          const qualified = JSON.parse(file.content);
          return { qualityComplete: qualified.status === 'qualified', outputs: qualified.qualifiedOutputs };
        },
        destroy: () => source().destroy(),
        recover: async () => {
          const recovered = await recoverBenchmark(input, {
            now: () => performance.now(), getSandbox: async () => live(),
            inspect: async sandbox => {
              for (const [name, content] of [['recovery_validator.py', qualificationSource], ['recovery_inspect.py', recoveryInspectionSource]]) {
                if (!(await sandbox.writeFile(`/workspace/helios-cpu/${name}`, content)).success) throw new Error('Resume evidence staging failed');
              }
              const response = await sandbox.exec('python3 /workspace/helios-cpu/recovery_inspect.py', { timeout: 5 * 60 * 1000 });
              if (!response.success || response.exitCode !== 0) throw new Error('Resumed evidence inspection failed');
            },
            candidate: (key, value) => this.env.MEMORY.put(key, JSON.stringify(value)),
            transfer: (key, sandbox) => publishArchive(key, sandbox, new MemoryStore(this.env.MEMORY)),
            publish: (key, value) => this.env.MEMORY.put(key, JSON.stringify(value)),
          });
          return { status: recovered.status, qualifiedOutputs: recovered.qualifiedOutputs };
        },
      });
      console.log('HELIOS_CPU_RESUME_QUALIFIED ' + JSON.stringify({ runId: input.runId, status: report.status, qualifiedOutputs: report.qualifiedOutputs }));
      return report;
    } catch {
      if (typeof input?.runId === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(input.runId)) {
        await this.env.MEMORY.put(`benchmarks/helios-cpu/${input.runId}/failure.json`, JSON.stringify({ status: 'failed', runId: input.runId, category: 'resumed-benchmark-unavailable-or-unqualified' }));
        console.log('HELIOS_CPU_RESUME_FAILED ' + JSON.stringify({ runId: input.runId }));
      }
      throw new Error('Checkpointed benchmark resume did not qualify');
    }
  }
}

export default {
  fetch() { return new Response('Benchmark submission requires the authenticated workflow API.', { status: 404 }); },
};
