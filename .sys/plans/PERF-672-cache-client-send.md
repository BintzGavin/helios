---
id: PERF-672
slug: cache-client-send
status: complete
claimed_by: "executor-session"
created: 2024-06-05
completed: ""
result: "discard"
---

# PERF-672: Cache Client Send Binding in CdpTimeDriver hot loop

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/drivers/CdpTimeDriver.ts`.

## Background Research
In the hot loop of `CdpTimeDriver.runSetTime`, the driver makes the following call on every frame:
`this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(...)`

The `client` is the Playwright `CDPSession`, and `send` is an asynchronous method we invoke up to 60 times a second. Every frame, V8 must resolve the property access `this.client!.send`, binding context dynamically.

By pre-caching a bound reference to `this.client!.send` as `this.cdpSend` during the `prepare()` setup, we can bypass the property resolution and ensure V8 only resolves the function pointer once instead of on every frame. Since Playwright's `CDPSession.send` method relies on `this` context internally, caching a pre-bound version (e.g. `this.client!.send.bind(this.client)`) removes this lookup overhead in the most critical frame hot loop path.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s (based on RENDERER-EXPERIMENTS.md data)
- **Bottleneck analysis**: Object property access inside the `runSetTime` CDP IPC hot loop.

## Implementation Spec

### Step 1: Prebind CDP `send` in `CdpTimeDriver`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Add a class property:
```typescript
<<<<<<< SEARCH
  private multiFrameSyncMediaParams: any[] = [];
  private hasMedia: boolean = true;

  private defaultSyncMedia() {
=======
  private multiFrameSyncMediaParams: any[] = [];
  private hasMedia: boolean = true;
  private cdpSend: any = null;

  private defaultSyncMedia() {
>>>>>>> REPLACE
```

Bind the property in `prepare()`:
```typescript
<<<<<<< SEARCH
  async prepare(page: Page): Promise<void> {
    if ((page as any)._sharedCdpSession) {
      this.client = (page as any)._sharedCdpSession;
    } else {
      this.client = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.client;
    }

    // Clean up potential previous listeners if reusing driver or session
=======
  async prepare(page: Page): Promise<void> {
    if ((page as any)._sharedCdpSession) {
      this.client = (page as any)._sharedCdpSession;
    } else {
      this.client = await page.context().newCDPSession(page);
      (page as any)._sharedCdpSession = this.client;
    }
    this.cdpSend = this.client!.send.bind(this.client);

    // Clean up potential previous listeners if reusing driver or session
>>>>>>> REPLACE
```

### Step 2: Use cached bound `send` in `runSetTime` and `defaultSyncMedia`
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
Replace `this.client!.send` with `this.cdpSend` in `runSetTime`:
```typescript
<<<<<<< SEARCH
    this.setVirtualTimePolicyParams.budget = budget;
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise.then(() => {
=======
    this.setVirtualTimePolicyParams.budget = budget;
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
    this.cdpSend('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch(this.handleVirtualTimeBudgetError);
    return promise.then(() => {
>>>>>>> REPLACE
```

And in `defaultSyncMedia`:
```typescript
<<<<<<< SEARCH
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "window.__helios_sync_media();",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.client!.send('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
          }
        } else {
          this.client!.send('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
        }
    }
  }
=======
  private defaultSyncMedia() {
    const frames = this.cachedFrames;
    if (frames.length === 1) {
      this.cdpSend('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
    } else {
        if (this.executionContextIds.length > 0) {
          if (this.multiFrameSyncMediaParams.length !== this.executionContextIds.length) {
            this.multiFrameSyncMediaParams.length = this.executionContextIds.length;
            for (let i = 0; i < this.executionContextIds.length; i++) {
              this.multiFrameSyncMediaParams[i] = {
                expression: "window.__helios_sync_media();",
                contextId: this.executionContextIds[i],
                awaitPromise: false,
                returnByValue: false
              };
            }
          }
          for (let i = 0; i < this.executionContextIds.length; i++) {
            this.cdpSend('Runtime.evaluate', this.multiFrameSyncMediaParams[i]).catch(noopCatch);
          }
        } else {
          this.cdpSend('Runtime.evaluate', this.singleFrameSyncMediaParams).catch(noopCatch);
        }
    }
  }
>>>>>>> REPLACE
```

**Why**: Calling `.bind` once dynamically saves property resolution (`this.client!.send`) overhead during the hundreds of invocations that occur in the hot loop. V8 can just resolve the function reference without validating prototype chains.
**Risk**: Functionally identical. No risk.

## Variations
None.

## Correctness Check
Run the `npx tsx packages/renderer/scripts/benchmark-perf.ts` script to test performance and verify correct output.

## Prior Art
- PERF-662 (Inline promise executor bypass overhead)
