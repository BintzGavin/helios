# Cloudflare Rendering Footguns

Production-verified pitfalls when running Helios distributed rendering on Cloudflare Workflows + Sandboxes. All patterns documented here were discovered in production via the SwirlBot agent platform.

## 1. Replay Determinism

**The Bug**: Generating IDs, timestamps, or random values outside of `step.do()`.

Cloudflare Workflows replay the `run()` function on every resume. Code not wrapped in a step is re-executed, producing new values each time.

```typescript
// ❌ BUG: New ID on every replay
const jobId = `render-${Date.now()}`;
await step.sleep("wait", "30 seconds");
await step.do("process", () => useJob(jobId)); // jobId changed!

// ✅ FIX: Generate inside step.do()
const jobId = await step.do("generate-id", () => `render-${Date.now()}`);
await step.sleep("wait", "30 seconds");
await step.do("process", () => useJob(jobId)); // Same jobId from cache
```

**Impact on Helios**: If `sandboxId` is generated with `Date.now()` outside a step, every workflow resume targets a new, empty sandbox container while the original sandbox (with the in-progress render) continues running unmonitored.

## 2. Container Recycling

Cloudflare can recycle sandbox containers at any time — including exactly at the 6-minute mark — even with `keepAlive: true` and active heartbeats.

### Detection

Check PID 1's start time against your recorded sandbox creation time:

```typescript
const pid1Output = await sandbox.exec('stat -c %Y /proc/1');
const pid1EpochMs = parseInt(pid1Output.trim(), 10) * 1000;

if (pid1EpochMs > sandboxCreatedAt + 60_000) {
  // Container was recycled — PID 1 is younger than our sandbox
  throw new Error('Container recycled by platform');
}
```

### Symptoms
- Status files (`/workspace/status.txt`) show `(not found)`
- Process list (`ps aux`) shows no render processes
- Files that were written earlier are missing
- Init process (PID 1) has a recent start time

### Mitigation
- **Checkpoints to R2**: Periodically save render progress externally
- **Log harvesting**: Persist logs on every poll cycle (see §5)
- **Graceful resumption**: On detecting recycling, provision a new sandbox and resume from checkpoint

## 3. keepAlive Heartbeat Placement

**The Mistake**: Calling `sandbox.setKeepAlive(true)` inside a `step.do()`.

Step side-effects run once and are cached on replay. After hibernation, the new sandbox reference won't have active heartbeats.

```typescript
// ❌ WRONG: Heartbeat stops after workflow resumes
await step.do("setup", async () => {
  const sandbox = getSandbox(ns, id);
  sandbox.setKeepAlive(true); // Side-effect, not replayed
});

// ✅ CORRECT: Pass as option — active on every reference
const sandbox = getSandbox(ns, id, { keepAlive: true });
```

**Rule**: Always pass `keepAlive` as a `getSandbox()` option, in BOTH the initiator step AND every poller step.

## 4. ANSI Code Handling

CLI tools (Helios renderer, FFmpeg, npm) produce ANSI escape codes for colors and progress bars. These cause two failure modes:

### Workflow State Serialization
`step.do()` return values are JSON-serialized into Workflow state. ANSI codes can produce unterminated strings or invalid JSON.

```typescript
// ❌ Raw logs break state serialization
return await step.do("check", () => {
  return sandbox.exec("cat /workspace/render.log"); // Contains \x1B[32m...
});

// ✅ Strip before returning
return await step.do("check", () => {
  const raw = sandbox.exec("cat /workspace/render.log");
  return raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''); // Clean ANSI
});
```

### MCP Tool Responses
Log strings with ANSI codes cause `Unterminated string in JSON` errors when processed by downstream tools.

**Best Practice**: Always strip ANSI codes before returning from steps or persisting to R2. Prefer direct R2 persistence from the poller to bypass Workflow state size limits entirely.

## 5. Log Harvesting

**Assume every container is about to be destroyed.** Persist diagnostic data to R2 on every poll cycle.

### Polling Snapshot Protocol

On each poll iteration, harvest:
1. `cat /workspace/render.log` — Render output
2. `ps aux` — Process list (detect missing processes)
3. `ls -la /workspace/` — File listing (detect missing outputs)

Persist each snapshot to R2 at `renders/{jobId}/logs/poll-{attempt}.txt`.

If the container is lost at Poll 6, the snapshot from Poll 5 shows exactly what was happening before destruction.

## 6. Checkpoint/Resume Pattern

For renders longer than ~5 minutes, implement checkpoint/resume to survive container recycling:

1. **Runner side**: After each chunk renders, upload to R2 and write a checkpoint marker
2. **On startup**: Check R2 for existing checkpoints for this `jobId`
3. **On resume**: Download checkpoint, skip already-rendered chunks, continue from last position

```typescript
// Runner-side checkpoint
const completed = await r2.list(`renders/${jobId}/chunks/`);
const startChunk = completed.objects.length; // Resume from here
```

## 7. Adaptive Polling Strategy

Fixed polling intervals waste Workflow steps (billed) or add latency. Use adaptive polling:

| Phase | When | Sleep Duration | Why |
|-------|------|---------------|-----|
| **Initial** | Poll 0 | `max(180s, duration × 30)` | Render needs time to start Chromium |
| **Refined** | Poll 1 | 60s | Most work should be done |
| **Responsive** | Poll 2+ | 30s | Quick completion detection |

A 20-minute render with 5s fixed polls = 240+ steps. Adaptive polling: ~10 steps.

## Quick Reference

| Pattern | Do | Don't |
|---------|-----|-------|
| ID Generation | Inside `step.do()` | Top-level `Date.now()` |
| keepAlive | `getSandbox()` option | `setKeepAlive()` side-effect |
| Logs | Strip ANSI before serialization | Return raw terminal output |
| Diagnostics | Harvest to R2 every poll | Rely on container persistence |
| Polling | Adaptive (long → short) | Fixed 5s intervals |
| Cleanup | Always `destroy()` in finally | Let containers linger |
