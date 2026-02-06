# 2026-10-02 - Configurable Asset Timeout

## 1. Context & Goal
- **Objective**: Align `DomScanner` and `DomStrategy` asset preloading timeouts with the user-configurable `stabilityTimeout` in `RendererOptions`.
- **Trigger**: `DomScanner` currently uses a hardcoded 10s timeout, ignoring the user's `stabilityTimeout` preference. `DomStrategy` preloading logic has no timeout at all, potentially causing hangs.
- **Impact**: Ensures robust rendering for compositions with heavy assets (by allowing longer timeouts) or failing fast (by allowing shorter timeouts), and prevents indefinite hangs during preloading.

## 2. File Inventory
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Accept timeout argument)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Pass `stabilityTimeout` to scanner and use in preload)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Pass `stabilityTimeout` to scanner)
- **Create**: `packages/renderer/tests/verify-asset-timeout.ts` (Verification script)
- **Read-Only**: `packages/renderer/src/types.ts` (To verify `stabilityTimeout` exists)

## 3. Implementation Spec

### Architecture
- **Pattern**: Configuration Propagation. Pass `stabilityTimeout` (defaulting to 30000ms) from `RendererOptions` down to strategies and utility functions.
- **DomScanner**: Update `scanForAudioTracks` to accept an optional `timeout` argument. Use this value (or default 10000/30000) for the `setTimeout` inside the browser script.
- **DomStrategy**:
  - Update `prepare(page)` to extract `stabilityTimeout` from `this.options`.
  - Pass this timeout to `scanForAudioTracks`.
  - Inject this timeout into the preloading script.
  - Wrap `Promise.all(images.map(...))` and `Promise.all(backgrounds.map(...))` logic with a `Promise.race([loadPromise, timeoutPromise])` to ensure it doesn't hang indefinitely. Log a warning on timeout.

### Pseudo-Code

**`packages/renderer/src/utils/dom-scanner.ts`**
```typescript
export async function scanForAudioTracks(page: Page, timeout: number = 30000): Promise<AudioTrackConfig[]> {
  // ... inside script ...
  setTimeout(() => {
     if (!resolved) {
        console.warn('Timeout...');
        finish();
     }
  }, timeout); // Use passed timeout
}
```

**`packages/renderer/src/strategies/DomStrategy.ts`**
```typescript
async prepare(page: Page): Promise<void> {
  const timeout = this.options.stabilityTimeout || 30000;

  // Update preloading script to accept timeout
  const script = `(async (timeoutMs) => {
     // ...
     const withTimeout = (promise, msg) => {
        return Promise.race([
           promise,
           new Promise(r => setTimeout(() => { console.warn(msg); r(); }, timeoutMs))
        ]);
     };

     await withTimeout(Promise.all(images.map(...)), "Image preload timeout");
  })(${timeout})`;

  // ...
  await scanForAudioTracks(page, timeout);
}
```

**`packages/renderer/src/strategies/CanvasStrategy.ts`**
```typescript
async prepare(page: Page): Promise<void> {
  const timeout = this.options.stabilityTimeout || 30000;
  // ...
  await scanForAudioTracks(page, timeout);
}
```

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-asset-timeout.ts`
- **Success Criteria**:
  1. Script sets up a page with a hanging resource (e.g. via `page.route` to stall `poster.jpg`).
  2. Runs `DomStrategy` with `stabilityTimeout: 2000`.
  3. Measures time taken for `prepare()`.
  4. Asserts time is ~2000ms (plus execution overhead), not 10000ms or infinite.
  5. Checks console logs for "Timeout waiting for..." warning.
- **Edge Cases**:
  - `stabilityTimeout` undefined (should default to 30000).
  - `stabilityTimeout` very short (should warn quickly).
