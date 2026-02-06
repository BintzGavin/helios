# 2026-10-08-PLAYER-Async-Seek.md

#### 1. Context & Goal
- **Objective**: Implement asynchronous seek in `HeliosController` (specifically `BridgeController`) to ensure `HeliosPlayer` waits for the frame update before dispatching the `seeked` event.
- **Trigger**: The current implementation of `currentTime` setter and `seek` assumes synchronous updates, which leads to race conditions in Bridge mode where `seeked` is fired before the frame is actually rendered.
- **Impact**: Improves Standard Media API compliance (`seeking`/`seeked`) and ensures tools like `ClientSideExporter` or external screenshot tools get the correct frame when seeking programmatically.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update interface and implementations)
- **Modify**: `packages/player/src/bridge.ts` (Send seek acknowledgement)
- **Modify**: `packages/player/src/index.ts` (Await seek in `currentTime` setter)
- **Modify**: `packages/player/src/features/exporter.ts` (Update `seek` usage if necessary)

#### 3. Implementation Spec
- **Architecture**:
    - Update `HeliosController` interface: `seek(frame: number): Promise<void>`.
    - **Bridge Protocol**: Add `HELIOS_SEEK_DONE` message type.
    - **BridgeController**: `seek` sends `HELIOS_SEEK` and waits for `HELIOS_SEEK_DONE` (with timeout).
    - **DirectController**: `seek` remains synchronous (resolves immediately) as `Helios` core updates state synchronously.
    - **HeliosPlayer**:
        - `set currentTime`/`set currentFrame`:
            1. Set internal `_isSeeking` flag to true.
            2. Dispatch `seeking` event.
            3. Call `await controller.seek(target)`.
            4. Set `_isSeeking` flag to false.
            5. Dispatch `seeked` event.
        - Scrubbing logic remains fire-and-forget for responsiveness, managing `seeking`/`seeked` via start/end events.

- **Public API Changes**:
    - `HeliosController.seek` now returns `Promise<void>`.
    - `HeliosPlayer.seeking` property will accurately reflect async seek state.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1. Build player: `npm run build -w packages/player`.
    2. Create a reproduction script `tests/reproduction/verify_async_seek.html` that:
       - Loads `helios-player` with a mock composition.
       - Sets `player.currentTime = 5`.
       - Listens for `seeking` and `seeked`.
       - Verifies that `player.seeking` is true between the events.
       - Verifies that `seeked` fires only after the bridge has confirmed the seek.
    3. Run existing tests: `npm test -w packages/player`.
- **Success Criteria**:
    - `player.seeking` is `true` immediately after setting `currentTime`.
    - `seeked` event fires *after* the internal seek promise resolves.
- **Edge Cases**:
    - Rapid seeking (race conditions) - handled by awaiting.
    - Bridge timeout (if composition doesn't reply) - controller should timeout and reject/resolve.
