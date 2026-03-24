import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';
import type { ArtifactStorage } from '../types/storage.js';

export interface CloudflareSandboxAdapterConfig {
  /** Cloudflare account ID */
  accountId: string;
  /** Cloudflare API token with Sandbox permissions */
  apiToken: string;
  /** Sandbox namespace (used as the sandbox identifier prefix) */
  namespace: string;
  /** Override the default render command executed inside the sandbox */
  renderCommand?: string;
  /** Base polling interval in milliseconds (default: 30000) */
  pollIntervalMs?: number;
  /** Maximum number of poll attempts before timeout (default: 60) */
  maxPollAttempts?: number;
  /** Optional storage adapter for log harvesting (e.g. R2StorageAdapter) */
  logStorage?: ArtifactStorage;
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 60;
const DEFAULT_RENDER_COMMAND = 'npx helios render /workspace/composition.html -o /workspace/output.mp4';

/**
 * Adapter for executing rendering jobs in Cloudflare Sandboxes.
 *
 * Cloudflare Sandboxes are full Linux containers with Chromium + FFmpeg,
 * orchestrated via the Cloudflare API. Unlike the constrained Workers adapter,
 * sandboxes support filesystem access, native binaries, and long-running processes.
 *
 * Key reliability patterns (from SwirlBot production):
 * - keepAlive: true to prevent eviction during long renders
 * - Container recycling detection via PID 1 start-time check
 * - Log harvesting to external storage on every poll cycle
 * - Adaptive polling: long initial sleep, shorter polls near completion
 */
export class CloudflareSandboxAdapter implements WorkerAdapter {
  private config: CloudflareSandboxAdapterConfig;
  private pollIntervalMs: number;
  private maxPollAttempts: number;
  private renderCommand: string;

  constructor(config: CloudflareSandboxAdapterConfig) {
    this.config = config;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
    this.renderCommand = config.renderCommand ?? DEFAULT_RENDER_COMMAND;
  }

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();

    const chunkId = job.meta?.chunkId;
    if (chunkId === undefined) {
      throw new Error('CloudflareSandboxAdapter requires job.meta.chunkId to be set');
    }

    // Generate a stable sandbox ID scoped to this execution.
    // CRITICAL: If used inside a Cloudflare Workflow, this ID must be generated
    // inside a step.do() to survive replay determinism. The adapter itself is
    // stateless — the caller is responsible for replay-safe orchestration.
    const sandboxId = `${this.config.namespace}-chunk-${chunkId}-${Date.now()}`;

    let sandbox: SandboxHandle | null = null;

    try {
      // Phase 1: Provision sandbox with keepAlive to prevent eviction
      sandbox = await this.createSandbox(sandboxId);

      if (job.signal?.aborted) {
        throw new Error('Job was cancelled');
      }

      // Phase 2: Inject job assets if a job definition URL is provided
      const jobDefUrl = job.meta?.jobDefUrl;
      if (jobDefUrl) {
        await this.execInSandbox(sandbox, `curl -sL "${jobDefUrl}" -o /workspace/job.json`);
      }

      // Phase 3: Start the render
      const renderCmd = this.buildRenderCommand(job);
      await this.execInSandbox(sandbox, `nohup sh -c '${renderCmd} > /workspace/render.log 2>&1; echo $? > /workspace/status.txt' &`);

      // Phase 4: Adaptive polling loop
      const result = await this.pollForCompletion(sandbox, sandboxId, job);

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.name === 'AbortError' || job.signal?.aborted) {
        errorMessage = 'Job was cancelled';
      }

      return {
        exitCode: 1,
        stdout: '',
        stderr: `Cloudflare Sandbox execution failed: ${errorMessage}`,
        durationMs: Date.now() - startTime,
      };
    } finally {
      // Phase 5: Cleanup — always destroy the sandbox
      if (sandbox) {
        try {
          await this.destroySandbox(sandbox);
        } catch {
          // Best-effort cleanup; don't mask the original error
        }
      }
    }
  }

  /**
   * Creates a sandbox container via the Cloudflare API.
   * Uses keepAlive: true to prevent eviction during long renders.
   */
  private async createSandbox(sandboxId: string): Promise<SandboxHandle> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/sandbox`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sandboxId,
          keepAlive: true,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create sandbox: HTTP ${response.status} - ${text}`);
    }

    const data = await response.json() as any;
    return {
      id: sandboxId,
      url: data.result?.url || `https://${sandboxId}.sandbox.cloudflare.com`,
      createdAt: Date.now(),
    };
  }

  /**
   * Executes a command inside the sandbox container.
   */
  private async execInSandbox(sandbox: SandboxHandle, command: string): Promise<string> {
    const response = await fetch(
      `${sandbox.url}/exec`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sandbox exec failed: HTTP ${response.status} - ${text}`);
    }

    const data = await response.json() as any;
    return data.result?.output || '';
  }

  /**
   * Polls the sandbox for render completion using adaptive polling.
   *
   * Adaptive strategy (from SwirlBot production):
   * - Poll 0: Long initial wait (renders take time to start)
   * - Poll 1: Medium wait (most of the work should be done)
   * - Poll 2+: Short, responsive polls
   *
   * On every poll cycle:
   * 1. Check status.txt for completion marker
   * 2. Detect container recycling via PID 1 start-time check
   * 3. Harvest logs to external storage (if configured)
   */
  private async pollForCompletion(
    sandbox: SandboxHandle,
    sandboxId: string,
    job: WorkerJob,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    let attempts = 0;

    while (attempts < this.maxPollAttempts) {
      if (job.signal?.aborted) {
        throw new Error('Job was cancelled');
      }

      // Adaptive sleep duration
      const sleepMs = this.getAdaptiveSleepMs(attempts);
      await this.sleep(sleepMs);

      // Check for container recycling
      const isRecycled = await this.detectRecycling(sandbox);
      if (isRecycled) {
        throw new Error(
          `Sandbox ${sandboxId} was recycled by the platform at poll attempt ${attempts}. ` +
          'Container PID 1 start time is newer than sandbox creation time.'
        );
      }

      // Harvest logs on every poll cycle (assume containers can die at any time)
      await this.harvestLogs(sandbox, sandboxId, attempts);

      // Check completion status
      const statusOutput = await this.execInSandbox(sandbox, 'cat /workspace/status.txt 2>/dev/null || echo "(not found)"');
      const status = statusOutput.trim();

      if (status === '(not found)') {
        // Still running — check if the render process is alive
        const psOutput = await this.execInSandbox(sandbox, 'ps aux | grep -v grep | grep helios || echo "(no process)"');
        if (psOutput.includes('(no process)') && attempts > 2) {
          // Process disappeared without writing status — likely crashed
          const logs = await this.execInSandbox(sandbox, 'cat /workspace/render.log 2>/dev/null || echo "(no logs)"');
          return {
            exitCode: 1,
            stdout: '',
            stderr: `Render process disappeared without writing status. Logs:\n${logs}`,
          };
        }
        attempts++;
        continue;
      }

      // Render completed — collect results
      const exitCode = parseInt(status, 10);
      const stdout = await this.execInSandbox(sandbox, 'cat /workspace/render.log 2>/dev/null || echo ""');
      // Strip ANSI codes from logs to prevent JSON serialization issues
      const cleanStdout = this.stripAnsi(stdout);

      if (exitCode === 0) {
        return { exitCode: 0, stdout: cleanStdout, stderr: '' };
      } else {
        return {
          exitCode,
          stdout: '',
          stderr: cleanStdout || `Render exited with code ${exitCode}`,
        };
      }
    }

    throw new Error(`Sandbox ${sandboxId} timed out after ${this.maxPollAttempts} poll attempts`);
  }

  /**
   * Adaptive polling sleep duration.
   * Long initial wait → medium → short responsive polls.
   */
  private getAdaptiveSleepMs(attempt: number): number {
    if (attempt === 0) {
      // Phase 1: Initial heavy lifting. Most renders take at least this long to start.
      return this.pollIntervalMs * 6; // 180s at default 30s interval
    }
    if (attempt === 1) {
      // Phase 2: Refined wait
      return this.pollIntervalMs * 2; // 60s default
    }
    // Phase 3: High responsiveness
    return this.pollIntervalMs; // 30s default
  }

  /**
   * Detects container recycling by checking PID 1 start time.
   * If the container's init process started after sandbox creation,
   * the container has been replaced by the platform.
   */
  private async detectRecycling(sandbox: SandboxHandle): Promise<boolean> {
    try {
      const output = await this.execInSandbox(sandbox, 'stat -c %Y /proc/1 2>/dev/null || echo "0"');
      const pid1StartEpoch = parseInt(output.trim(), 10) * 1000; // Convert to ms

      if (pid1StartEpoch > 0 && pid1StartEpoch > sandbox.createdAt + 60_000) {
        // PID 1 started more than 60s after sandbox creation — recycled
        return true;
      }
    } catch {
      // If we can't check, assume not recycled and continue
    }
    return false;
  }

  /**
   * Harvests logs from the sandbox to external storage.
   * Ensures diagnostic data survives container destruction.
   */
  private async harvestLogs(sandbox: SandboxHandle, sandboxId: string, attempt: number): Promise<void> {
    if (!this.config.logStorage) return;

    try {
      const logs = await this.execInSandbox(sandbox, 'cat /workspace/render.log 2>/dev/null || echo "(no logs yet)"');
      const ps = await this.execInSandbox(sandbox, 'ps aux 2>/dev/null || echo "(unavailable)"');
      const ls = await this.execInSandbox(sandbox, 'ls -la /workspace/ 2>/dev/null || echo "(unavailable)"');

      const snapshot = [
        `=== Poll ${attempt} at ${new Date().toISOString()} ===`,
        `\n--- Render Logs ---\n${this.stripAnsi(logs)}`,
        `\n--- Process List ---\n${ps}`,
        `\n--- Workspace Files ---\n${ls}`,
      ].join('\n');

      // Write to a temp file and upload
      const tmpDir = `/tmp/helios-logs-${sandboxId}`;
      const fs = await import('node:fs/promises');
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(`${tmpDir}/poll-${attempt}.txt`, snapshot);
      await this.config.logStorage.uploadAssetBundle(
        `logs/${sandboxId}`,
        tmpDir,
      );
    } catch {
      // Log harvesting is best-effort — don't fail the render
    }
  }

  /**
   * Builds the render command with job-specific parameters.
   */
  private buildRenderCommand(job: WorkerJob): string {
    if (job.meta?.renderCommand) {
      return job.meta.renderCommand;
    }
    return this.renderCommand;
  }

  /**
   * Destroys a sandbox container and releases resources.
   */
  private async destroySandbox(sandbox: SandboxHandle): Promise<void> {
    await fetch(
      `${sandbox.url}/destroy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /** Strips ANSI escape codes from log output to prevent JSON serialization issues. */
  private stripAnsi(input: string): string {
    // eslint-disable-next-line no-control-regex
    return input.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Internal handle for a provisioned sandbox container. */
interface SandboxHandle {
  id: string;
  url: string;
  createdAt: number;
}
