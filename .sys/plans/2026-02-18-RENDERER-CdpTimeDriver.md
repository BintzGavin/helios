# 📋 RENDERER: Implement CdpTimeDriver

#### 1. Context & Goal
- **Objective**: Implement `CdpTimeDriver` using Chrome DevTools Protocol (CDP) to virtualize time during rendering, replacing the current `SeekTimeDriver` (WAAPI) implementation in the production renderer.
- **Trigger**: Vision Gap. The `README.md` explicitly states: "For Production Rendering: Helios uses the Chrome DevTools Protocol (CDP) to virtualize time...". Currently, `Renderer` uses `SeekTimeDriver`, which is intended for Preview/Development.
- **Impact**: Aligns the codebase with the documented architecture, ensuring deterministic rendering by decoupling the browser clock from wall-clock time. This improves render stability and correctness for complex animations.

#### 2. File Inventory
- **Create**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
- **Modify**: `packages/renderer/src/index.ts`
- **Read-Only**: `packages/renderer/src/drivers/TimeDriver.ts`, `packages/renderer/src/drivers/SeekTimeDriver.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Implement `TimeDriver` interface in `CdpTimeDriver`.
  - Use Playwright's `CDPSession` via `page.context().newCDPSession(page)`.
  - Use `Emulation.setVirtualTimePolicy` to advance time deterministically.
- **Pseudo-Code (CdpTimeDriver)**:
  - Class property: `private client: CDPSession | null = null;`
  - Class property: `private currentTime: number = 0;`
  - `async prepare(page: Page)`:
    - `this.client = await page.context().newCDPSession(page);`
    - `await this.client.send('Emulation.setVirtualTimePolicy', { policy: 'pause', budget: 0 });`
    - `this.currentTime = 0;`
  - `async setTime(page: Page, timeInSeconds: number)`:
    - `const delta = timeInSeconds - this.currentTime;`
    - `if (delta <= 0) return;`
    - `await this.client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: delta * 1000 });`
    - `this.currentTime = timeInSeconds;`
- **Modifications (index.ts)**:
  - Import `CdpTimeDriver`.
  - In constructor, change `this.timeDriver = new SeekTimeDriver()` to `this.timeDriver = new CdpTimeDriver()`.

#### 4. Test Plan
- **Verification**: `npm run render:canvas-example`
- **Success Criteria**:
  - Render process completes successfully.
  - Output video `output.mp4` is valid.
  - Console logs show `Spawning FFmpeg...` and frame progress.
- **Edge Cases**:
  - Verify `setTime` with 0 delta (should do nothing).
  - Verify render start (time 0).
