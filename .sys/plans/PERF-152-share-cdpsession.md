---
id: PERF-152
slug: share-cdpsession
status: unclaimed
claimed_by: ""
created: 2024-10-25
completed: ""
result: ""
---

# PERF-152: Share CDPSession Between Strategy and TimeDriver

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`, `packages/renderer/src/drivers/SeekTimeDriver.ts`, and `packages/renderer/src/drivers/CdpTimeDriver.ts`. We want to eliminate redundant CDP connections per worker and guarantee strictly sequential command execution.

## Background Research
Currently, `DomStrategy` and `TimeDriver` (both `SeekTimeDriver` and `CdpTimeDriver`) each create their own independent `CDPSession` via `page.context().newCDPSession(page)`. By sharing a single `CDPSession` per worker page, we eliminate the IPC overhead of managing redundant CDP connections in both Node.js and Chromium. Furthermore, sharing the session mathematically guarantees that pipelined CDP commands (like `Runtime.evaluate` for seeking and `HeadlessExperimental.beginFrame` for capturing) are executed strictly in order by Chromium, securing the pipeline architecture introduced in PERF-114.

## Benchmark Configuration
- **Composition URL**: Standard benchmark fixture (`output/example-build/examples/simple-animation/composition.html`)
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: 32.057s
- **Bottleneck analysis**: IPC latency and redundant session initialization overhead.

## Implementation Spec

### Step 1: Share session in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify the `prepare` method to reuse an existing session if available on the page object:
```typescript
    if ((page as any)._sharedCdpSession) {
      this.cdpSession = (page as any)._sharedCdpSession;
    } else {
      this.cdpSession = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.cdpSession;
    }
    await this.cdpSession.send('HeadlessExperimental.enable');
```
**Why**: Avoid redundant initialization.
**Risk**: Playwright might garbage collect or mismanage raw property injection, but typically safe.

### Step 2: Share session in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify `prepare`:
```typescript
    if ((page as any)._sharedCdpSession) {
      this.cdpSession = (page as any)._sharedCdpSession;
    } else {
      this.cdpSession = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.cdpSession;
    }
```

### Step 3: Share session in CdpTimeDriver
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Modify `prepare`:
```typescript
    if ((page as any)._sharedCdpSession) {
      this.client = (page as any)._sharedCdpSession;
    } else {
      this.client = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.client;
    }
```

### Step 4: Prevent Premature Detachment
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify `finish` to avoid detaching the shared session, which would break the TimeDriver.
```typescript
  async finish(page: Page): Promise<void> {
    if (this.cdpSession) {
      this.cdpSession = null;
    }
  }
```

## Variations
None.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds and produces a valid output.
Also run TimeDriver verification tests to ensure they are stable:
`npx tsx packages/renderer/tests/verify-seek-driver-determinism.ts`
`npx tsx packages/renderer/tests/verify-cdp-driver.ts`
