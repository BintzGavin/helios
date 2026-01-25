# RENDERER: Refactor Time Control to Driver Pattern

## 1. Context & Goal
- **Objective**: Decouple time synchronization logic from rendering strategies by introducing a `TimeDriver` interface.
- **Trigger**: Roadmap item "Architecture Hardening #1: TimeDriver Abstraction" and Vision Gap (Production Rendering should use CDP).
- **Impact**: Enables swapping between "Seek-based" time control (Preview) and "CDP-based" time control (Production) without modifying render strategies. This is a prerequisite for implementing the `CdpTimeDriver` which is required for the "Production Rendering" vision.

## 2. File Inventory
- **Create**:
  - `packages/renderer/src/drivers/TimeDriver.ts`: Interface definition for time drivers.
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Implementation of the current `requestAnimationFrame`-based seeking logic.
- **Modify**:
  - `packages/renderer/src/strategies/RenderStrategy.ts`: Update documentation for `capture` (it no longer sets time).
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Remove `document.timeline.currentTime` logic from `capture` methods.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Remove `document.timeline.currentTime` logic from `capture` method.
  - `packages/renderer/src/index.ts`: Instantiate `SeekTimeDriver` and call `driver.setTime` before `strategy.capture`.
- **Read-Only**:
  - `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture**:
  - Use the **Strategy Pattern** for time control.
  - `Renderer` owns a `TimeDriver` instance.
  - `RenderStrategy` is responsible *only* for capturing the frame (pixel extraction), not for setting the time.

- **Pseudo-Code**:

  **1. `src/drivers/TimeDriver.ts`**
  ```typescript
  export interface TimeDriver {
    /**
     * Prepares the driver (e.g., setting up CDP session or initial overrides).
     */
    prepare(page: Page): Promise<void>;

    /**
     * Sets the composition time to the specified value.
     * @param timeInSeconds The time to seek to in seconds.
     */
    setTime(page: Page, timeInSeconds: number): Promise<void>;
  }
  ```

  **2. `src/drivers/SeekTimeDriver.ts`**
  ```typescript
  export class SeekTimeDriver implements TimeDriver {
    async prepare(page: Page): Promise<void> {
      // No-op for Seek driver, or generic setup if needed
    }

    async setTime(page: Page, timeInSeconds: number): Promise<void> {
      await page.evaluate((t) => {
        // Set time and wait for frame
        (document.timeline as any).currentTime = t * 1000; // Convert to ms
        return new Promise<void>(resolve => {
          requestAnimationFrame(() => resolve());
        });
      }, timeInSeconds);
    }
  }
  ```

  **3. `src/strategies/CanvasStrategy.ts`**
  - Remove the block:
    ```typescript
    (document.timeline as any).currentTime = time;
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    ```
  - `capture` (and `captureWebCodecs`) continues to accept `frameTime` because `VideoFrame` requires the timestamp metadata.

  **4. `src/strategies/DomStrategy.ts`**
  - Remove the block:
    ```typescript
    (document.timeline as any).currentTime = timeValue;
    return new Promise<void>((resolve) => { requestAnimationFrame(resolve); });
    ```
  - `capture` just calls `page.screenshot()`.

  **5. `src/index.ts` (Renderer)**
  - Add `private timeDriver: TimeDriver;`
  - In constructor: `this.timeDriver = new SeekTimeDriver();`
  - In `render` loop:
    ```typescript
    const time = (i / fps) * 1000; // ms for logging/strategies
    const timeInSeconds = i / fps;

    // 1. Advance Time
    await this.timeDriver.setTime(page, timeInSeconds);

    // 2. Capture
    const buffer = await this.strategy.capture(page, time);
    ```

- **Public API Changes**: None (Internal refactor).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run the existing canvas example verification script:
    `npm run render:canvas-example`
- **Success Criteria**:
  - The render process completes with exit code 0.
  - The output video `output.mp4` is generated.
  - No errors in console regarding "Canvas not found" or "Timeline access".
- **Edge Cases**:
  - **WebCodecs Timestamp**: Ensure `CanvasStrategy` still receives the correct `time` (in ms) to tag the `VideoFrame`.
  - **Race Conditions**: Verify `driver.setTime` fully awaits the frame update before `capture` is called (guaranteed by `await page.evaluate` in driver).
