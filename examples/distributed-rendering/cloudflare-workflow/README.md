# Cloudflare Workflow Distributed Rendering

This example demonstrates distributed video rendering using Cloudflare Workflows + Sandboxes, orchestrated by Helios's infrastructure package.

## Architecture

```
HTTP Trigger → Worker → Workflow
                          ├── step.do("generate-id")      → Replay-safe job ID
                          ├── step.do("provision")         → Create sandbox (keepAlive: true)
                          ├── step.do("inject-assets")     → Upload composition to sandbox
                          ├── step.do("start-render")      → Execute render command
                          ├── step.sleep() + poll loop     → Adaptive polling with log harvesting
                          ├── step.do("collect-output")    → Download rendered video
                          └── step.do("cleanup")           → Destroy sandbox
```

## Prerequisites

- Cloudflare account with Workers, Workflows, R2, and Sandboxes enabled
- `wrangler` CLI installed (`npm install -g wrangler`)
- R2 bucket created for render artifacts

## Setup

1. Copy this example into your project:
   ```bash
   npx helios init --example distributed-rendering/cloudflare-workflow
   ```

2. Configure your `wrangler.toml` with your account details:
   ```toml
   [vars]
   CF_ACCOUNT_ID = "your-account-id"
   R2_BUCKET = "helios-renders"
   ```

3. Create R2 API tokens and add them as secrets:
   ```bash
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   wrangler secret put CF_API_TOKEN
   ```

4. Deploy:
   ```bash
   wrangler deploy
   ```

5. Trigger a render:
   ```bash
   curl -X POST https://your-worker.your-subdomain.workers.dev/render \
     -H "Content-Type: application/json" \
     -d '{"compositionUrl": "https://example.com/composition.html", "chunks": 4}'
   ```

## Key Patterns

### Replay Determinism
All state-generating logic (IDs, timestamps) runs inside `step.do()` so values survive workflow hibernation and replay. See the [footguns guide](../../../docs/site/guides/cloudflare-rendering-footguns.md).

### Adaptive Polling
The poll loop uses a phased strategy: long initial sleep (3+ min), medium second poll (60s), then short responsive polls (30s). This minimizes Workflow step count while maintaining responsiveness.

### Log Harvesting
Render logs are persisted to R2 on every poll cycle. If the container is recycled by the platform (which can happen even with `keepAlive`), the last harvested log snapshot shows exactly what the render was doing before destruction.

### Container Recycling Detection
Each poll checks PID 1's start time against the sandbox creation timestamp. If PID 1 is newer, the container was recycled and the workflow raises an error rather than polling a dead container.

## Files

- `wrangler.toml` — Worker + Workflow + R2 bindings
- `src/index.ts` — Worker entrypoint with HTTP trigger
- `src/render-workflow.ts` — Durable multi-step Workflow class
