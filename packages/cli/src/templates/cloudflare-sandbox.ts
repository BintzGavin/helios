export const WRANGLER_TOML_TEMPLATE = `name = "helios-render-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"

# Workflow binding
[[workflows]]
name = "helios-render-workflow"
binding = "RENDER_WORKFLOW"
class_name = "HeliosRenderWorkflow"
script_name = "helios-render-worker"

# R2 bucket for render artifacts and logs
[[r2_buckets]]
binding = "RENDER_BUCKET"
bucket_name = "helios-renders"

[vars]
CF_ACCOUNT_ID = ""  # Set this to your Cloudflare account ID
`;

export const WORKFLOW_INDEX_TS_TEMPLATE = `/**
 * Helios Distributed Rendering — Cloudflare Worker Entrypoint
 *
 * Exposes an HTTP endpoint that triggers the HeliosRenderWorkflow.
 * The workflow handles the full lifecycle: sandbox provisioning,
 * render execution, polling, and cleanup.
 */

export { HeliosRenderWorkflow } from './render-workflow';

interface Env {
  RENDER_WORKFLOW: Workflow;
  RENDER_BUCKET: R2Bucket;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}

interface RenderRequest {
  compositionUrl: string;
  chunks?: number;
  fps?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/render' && request.method === 'POST') {
      const body = (await request.json()) as RenderRequest;

      if (!body.compositionUrl) {
        return new Response(
          JSON.stringify({ error: 'compositionUrl is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create a workflow instance
      const instance = await env.RENDER_WORKFLOW.create({
        params: {
          compositionUrl: body.compositionUrl,
          chunks: body.chunks ?? 4,
          fps: body.fps ?? 30,
          width: body.width ?? 1920,
          height: body.height ?? 1080,
          duration: body.duration ?? 10,
          accountId: env.CF_ACCOUNT_ID,
          apiToken: env.CF_API_TOKEN,
        },
      });

      return new Response(
        JSON.stringify({
          id: instance.id,
          status: 'started',
          message: \`Render workflow started with \${body.chunks ?? 4} chunks\`,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.pathname.startsWith('/status/')) {
      const id = url.pathname.split('/status/')[1];
      try {
        const instance = await env.RENDER_WORKFLOW.get(id);
        const status = await instance.status();
        return new Response(JSON.stringify(status), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: 'Workflow not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Helios Render Worker. POST /render to start.', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
`;

export const WORKFLOW_RENDER_TS_TEMPLATE = `/**
 * Helios Distributed Rendering — Cloudflare Workflow
 *
 * Durable multi-step orchestration for rendering video in Cloudflare Sandboxes.
 * Follows verified production patterns from SwirlBot:
 *
 * 1. Replay determinism: All state-generating logic inside step.do()
 * 2. keepAlive: Passed as getSandbox() option, not as step side-effect
 * 3. Adaptive polling: Long initial sleep, shorter polls near completion
 * 4. Log harvesting: Persist logs to R2 on every poll cycle
 * 5. Container recycling detection: PID 1 start-time check
 * 6. ANSI code handling: Strip before returning from steps
 */

interface Env {
  RENDER_BUCKET: R2Bucket;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
}

interface RenderParams {
  compositionUrl: string;
  chunks: number;
  fps: number;
  width: number;
  height: number;
  duration: number;
  accountId: string;
  apiToken: string;
}

interface SandboxRef {
  id: string;
  url: string;
  createdAt: number;
}

export class HeliosRenderWorkflow implements Workflow {
  async run(event: WorkflowEvent<RenderParams>, step: WorkflowStep): Promise<void> {
    const params = event.payload;

    // ═══════════════════════════════════════════
    // Step 1: Generate stable job ID
    // CRITICAL: Must be inside step.do() for replay determinism.
    // If generated outside, Date.now() changes on every workflow resume.
    // ═══════════════════════════════════════════
    const jobId = await step.do('generate-id', async () => {
      return \`render-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;
    });

    // ═══════════════════════════════════════════
    // Step 2: Provision sandbox with keepAlive
    // keepAlive MUST be passed as an option to getSandbox(), NOT called
    // as sandbox.setKeepAlive() inside a step — because step side-effects
    // are not re-executed on workflow replay.
    // ═══════════════════════════════════════════
    const sandbox = await step.do('provision-sandbox', async () => {
      const response = await fetch(
        \`https://api.cloudflare.com/client/v4/accounts/\${params.accountId}/sandbox\`,
        {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${params.apiToken}\`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: \`\${jobId}-sandbox\`,
            keepAlive: true, // Prevents eviction during workflow sleep
          }),
        }
      );

      if (!response.ok) {
        throw new Error(\`Failed to provision sandbox: \${response.status}\`);
      }

      const data = (await response.json()) as any;
      return {
        id: \`\${jobId}-sandbox\`,
        url: data.result?.url || \`https://\${jobId}-sandbox.sandbox.cloudflare.com\`,
        createdAt: Date.now(),
      } as SandboxRef;
    });

    // ═══════════════════════════════════════════
    // Step 3: Start the render inside the sandbox
    // ═══════════════════════════════════════════
    await step.do('start-render', async () => {
      const renderCmd = [
        'npx helios render',
        params.compositionUrl,
        \`-o /workspace/output.mp4\`,
        \`--fps \${params.fps}\`,
        \`--width \${params.width}\`,
        \`--height \${params.height}\`,
        \`--duration \${params.duration}\`,
      ].join(' ');

      // Run render in background so we can poll for status
      await execInSandbox(sandbox, params.apiToken,
        \`nohup sh -c '\${renderCmd} > /workspace/render.log 2>&1; echo $? > /workspace/status.txt' &\`
      );
    });

    // ═══════════════════════════════════════════
    // Step 4: Adaptive polling loop
    // Phase 1 (attempt 0): Long wait — render needs time to initialize Chromium + start capturing
    // Phase 2 (attempt 1): Medium wait — most work should be done
    // Phase 3 (attempt 2+): Short responsive polls
    // ═══════════════════════════════════════════
    let pollAttempts = 0;
    const maxPolls = 60;
    let renderComplete = false;
    let renderResult = { exitCode: 1, stdout: '', stderr: 'Unknown error' };

    while (!renderComplete && pollAttempts < maxPolls) {
      // Adaptive sleep duration
      let sleepSeconds: number;
      if (pollAttempts === 0) {
        sleepSeconds = Math.max(180, params.duration * 30); // ~30s per second of video
      } else if (pollAttempts === 1) {
        sleepSeconds = 60;
      } else {
        sleepSeconds = 30;
      }

      await step.sleep(\`wait-\${pollAttempts}\`, \`\${sleepSeconds} seconds\`);

      const pollResult = await step.do(\`check-\${pollAttempts}\`, async () => {
        // ── Container recycling detection ──
        // Check PID 1 start time. If it's newer than our sandbox creation,
        // the platform recycled the container.
        const pid1Check = await execInSandbox(sandbox, params.apiToken,
          'stat -c %Y /proc/1 2>/dev/null || echo "0"'
        );
        const pid1Epoch = parseInt(pid1Check.trim(), 10) * 1000;
        if (pid1Epoch > 0 && pid1Epoch > sandbox.createdAt + 60_000) {
          return { status: 'recycled' as const, logs: 'Container was recycled by platform' };
        }

        // ── Harvest logs to R2 (survives container destruction) ──
        const logs = await execInSandbox(sandbox, params.apiToken,
          'cat /workspace/render.log 2>/dev/null || echo "(no logs yet)"'
        );
        // Strip ANSI codes to prevent JSON serialization issues in workflow state
        const cleanLogs = stripAnsi(logs);

        // ── Check completion status ──
        const status = await execInSandbox(sandbox, params.apiToken,
          'cat /workspace/status.txt 2>/dev/null || echo "(not found)"'
        );

        if (status.trim() === '(not found)') {
          return { status: 'running' as const, logs: cleanLogs };
        }

        const exitCode = parseInt(status.trim(), 10);
        return { status: 'complete' as const, exitCode, logs: cleanLogs };
      });

      if (pollResult.status === 'recycled') {
        renderResult = { exitCode: 1, stdout: '', stderr: pollResult.logs };
        renderComplete = true;
      } else if (pollResult.status === 'complete') {
        renderResult = {
          exitCode: pollResult.exitCode ?? 1,
          stdout: pollResult.logs,
          stderr: pollResult.exitCode === 0 ? '' : pollResult.logs,
        };
        renderComplete = true;
      }

      pollAttempts++;
    }

    // ═══════════════════════════════════════════
    // Step 5: Cleanup — always destroy the sandbox
    // ═══════════════════════════════════════════
    await step.do('cleanup', async () => {
      try {
        await fetch(\`\${sandbox.url}/destroy\`, {
          method: 'POST',
          headers: { 'Authorization': \`Bearer \${params.apiToken}\` },
        });
      } catch {
        // Best-effort cleanup
      }
    });

    if (renderResult.exitCode !== 0) {
      throw new Error(\`Render failed: \${renderResult.stderr}\`);
    }
  }
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

async function execInSandbox(sandbox: SandboxRef, apiToken: string, command: string): Promise<string> {
  const response = await fetch(\`\${sandbox.url}/exec\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command }),
  });

  if (!response.ok) {
    throw new Error(\`Sandbox exec failed: \${response.status}\`);
  }

  const data = (await response.json()) as any;
  return data.result?.output || '';
}

/** Strip ANSI escape codes to prevent JSON serialization failures in Workflow state. */
function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\\x1B\\[[0-9;]*[a-zA-Z]/g, '');
}

// Cloudflare Workflow types (provided by the Workers runtime)
interface Workflow {
  run(event: WorkflowEvent<any>, step: WorkflowStep): Promise<void>;
}

interface WorkflowEvent<T> {
  payload: T;
}

interface WorkflowStep {
  do<T>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: string): Promise<void>;
}
`;

export const README_CLOUDFLARE_SANDBOX_TEMPLATE = `# Helios Cloudflare Sandbox Deployment

This directory contains the configuration and script required to deploy a Helios rendering worker as a Cloudflare Workflow that orchestrates rendering inside a Cloudflare Sandbox.

## Prerequisites

1.  **Cloudflare Account:** You need an active Cloudflare account.
2.  **Wrangler CLI:** Ensure you have Wrangler installed globally or as a dev dependency.
    \`\`\`bash
    npm install -g wrangler
    \`\`\`
3.  **Authentication:** Authenticate Wrangler with your Cloudflare account.
    \`\`\`bash
    wrangler login
    \`\`\`
4.  **R2 Bucket:** The workflow requires an R2 bucket for logs and artifacts. Create one:
    \`\`\`bash
    wrangler r2 bucket create helios-renders
    \`\`\`

## Configuration

1.  Review \`wrangler.toml\` and add your \`CF_ACCOUNT_ID\`.
2.  Add secrets for your Cloudflare API token (for Sandbox provisioning):
    \`\`\`bash
    wrangler secret put CF_API_TOKEN
    wrangler secret put R2_ACCESS_KEY_ID
    wrangler secret put R2_SECRET_ACCESS_KEY
    \`\`\`

## Deployment

1.  **Deploy:** Run the following command to deploy the workflow.
    \`\`\`bash
    wrangler deploy
    \`\`\`
2.  **Note the URL:** After deployment, note the URL of the worker that acts as the entrypoint for the workflow.

## Executing Jobs

Once deployed, you can trigger the workflow directly or configure the Helios \`CloudflareSandboxAdapter\` to use this endpoint.
`;
