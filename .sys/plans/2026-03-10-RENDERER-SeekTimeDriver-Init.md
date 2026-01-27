# Context & Goal
- **Objective**: Fix `SeekTimeDriver` initialization to ensure deterministic time polyfills are injected before page load.
- **Trigger**: The current implementation of `SeekTimeDriver.prepare` calls `page.addInitScript` *after* `page.goto` (in `Renderer.ts`), which makes the polyfill ineffective for the initial page load.
- **Impact**: Enables truly deterministic rendering for DOM-based animations (WAAPI, `requestAnimationFrame`, `Date.now`, `performance.now`).

# File Inventory
- **Create**: None
- **Modify**:
    - `packages/renderer/src/drivers/TimeDriver.ts`: Add `init(page: Page): Promise<void>` to the interface.
    - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Implement `init` by moving `page.addInitScript` logic from `prepare`.
    - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Implement empty `init` method.
    - `packages/renderer/src/index.ts`: Update `Renderer` class to call `timeDriver.init(page)` before `page.goto`.
    - `packages/renderer/tests/verify-seek-driver-determinism.ts`: Update test usage to call `driver.init(page)` before navigation.
- **Read-Only**: `packages/renderer/src/strategies/DomStrategy.ts`

# Implementation Spec
- **Architecture**: Extend `TimeDriver` with a pre-load initialization hook (`init`) to handle script injection, separating it from post-load setup (`prepare`).
- **Pseudo-Code**:
    ```typescript
    // In TimeDriver.ts
    interface TimeDriver {
      init(page: Page): Promise<void>; // New method
      prepare(page: Page): Promise<void>; // Existing
      setTime(page: Page, time: number): Promise<void>; // Existing
    }

    // In SeekTimeDriver.ts
    class SeekTimeDriver implements TimeDriver {
      async init(page: Page) {
        // Move logic from prepare() here:
        await page.addInitScript(() => { ... });
      }
      async prepare(page: Page) {
        // Empty or lightweight check
      }
    }

    // In CdpTimeDriver.ts
    class CdpTimeDriver implements TimeDriver {
      async init(page: Page) {
        // No-op
      }
      async prepare(page: Page) {
        // Existing CDP session setup
      }
    }

    // In Renderer.ts (index.ts)
    // ...
    if (this.options.inputProps) { ... }

    // Call init before navigation
    await this.timeDriver.init(page);

    await page.goto(compositionUrl, ...);

    // ...
    // Call prepare after navigation (as before)
    await this.timeDriver.prepare(page);
    await this.strategy.prepare(page);
    ```

- **Public API Changes**: `TimeDriver` interface gains `init` method. No changes to `RendererOptions` or external API.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npx ts-node packages/renderer/tests/verify-seek-driver-determinism.ts`.
- **Success Criteria**: The test passes (exits with 0) and verifies that `Date.now()` / `performance.now()` values match the deterministic time set by the driver.
- **Edge Cases**: Verify `CdpTimeDriver` still works by running `npx ts-node packages/renderer/tests/test-cdp-driver.ts`.
