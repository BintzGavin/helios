# RENDERER: Implement CdpTimeDriver Media Sync

#### 1. Context & Goal
- **Objective**: Implement manual synchronization for `<video>` and `<audio>` elements in `CdpTimeDriver` to respect `data-helios-offset` and `data-helios-seek` attributes during Canvas rendering.
- **Trigger**: Vision gap (Canvas/DOM parity) and observed inability to use video textures with offsets in Canvas mode.
- **Impact**: Enables correct playback of offset/seeked media elements in hybrid Canvas/DOM compositions. Also fixes a workspace dependency mismatch blocking test execution.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-media-offsets.ts` (Verification test)
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts` (Implement sync logic)
- **Read-Only**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Reference implementation)

#### 3. Implementation Spec
- **Architecture**:
  - In `CdpTimeDriver.setTime(time)`:
    - After advancing virtual time via CDP (`Emulation.setVirtualTimePolicy`), inject a script to manually synchronize media elements.
    - **Logic**:
      1. Find all `video`, `audio` elements.
      2. Pause them (to take manual control).
      3. Parse `data-helios-offset` and `data-helios-seek`.
      4. Calculate `targetTime = globalTime - offset + seek`.
      5. Set `el.currentTime = targetTime`.
      6. **Crucial**: Do NOT await `seeked` or `canplay` events loop, as CDP virtual time 'pause' effectively freezes the task runner, causing a deadlock if we wait for async events. Assume `currentTime` setter is sufficient for visual update (best effort for Canvas mode).

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-media-offsets.ts`
  - **Setup**: Create a test page with `<video>` elements using offsets/seeks.
  - **Action**: Use `CdpTimeDriver` to advance time to `1.0` and `3.0`.
  - **Assert**: Check `el.currentTime` matches expected offset math (e.g., `t=1, offset=2` -> `currentTime=0`).
- **Success Criteria**: All assertions pass.
- **Regression**: `npx tsx packages/renderer/tests/verify-cdp-driver.ts` should still pass.
