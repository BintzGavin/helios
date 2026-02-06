# 2026-03-14-RENDERER-Refactor-Media-Sync-Logic.md

#### 1. Context & Goal
- **Objective**: Consolidate duplicate media attribute parsing and time calculation logic from `SeekTimeDriver`, `CdpTimeDriver`, and `dom-scanner` into a shared utility in `dom-scripts.ts`.
- **Trigger**: Maintenance gap identified; inconsistent or duplicated logic for `data-helios-offset`, `playbackRate`, and looping across different drivers.
- **Impact**: Ensures consistent rendering behavior across DOM and Canvas modes (CDP vs Seek), reduces code duplication, and simplifies future updates to media synchronization logic.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/utils/dom-scripts.ts` (Add `PARSE_MEDIA_ATTRIBUTES_FUNCTION`, `SYNC_MEDIA_FUNCTION`)
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Use shared functions)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Use shared functions)
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Use shared functions)

#### 3. Implementation Spec
- **Architecture**: Extract common logic into `dom-scripts.ts` as string constants defining JS functions. Inject these into the browser context in each consumer.
- **Pseudo-Code**:
  - `dom-scripts.ts`:
    - Define `PARSE_MEDIA_ATTRIBUTES_FUNCTION` string:
      - Helper function `parseMediaAttributes(el)`:
        - Parses `data-helios-offset`, `data-helios-seek`, `data-helios-fade-in`, `data-helios-fade-out`.
        - Parses `playbackRate` (property or attribute).
        - Returns object with parsed values.
    - Define `SYNC_MEDIA_FUNCTION` string:
      - Helper function `syncMediaElement(el, globalTime)`:
        - Calls `parseMediaAttributes(el)`.
        - Calculates `targetTime = (globalTime - offset) * rate + seek`.
        - Handles looping: `targetTime % duration`.
        - Sets `el.currentTime = targetTime`.
  - `SeekTimeDriver.ts`:
    - In `setTime`, inject `${PARSE_MEDIA_ATTRIBUTES_FUNCTION}` and `${SYNC_MEDIA_FUNCTION}`.
    - Replace duplicate logic with `syncMediaElement(el, t)`.
  - `CdpTimeDriver.ts`:
    - In `setTime`, inject `${PARSE_MEDIA_ATTRIBUTES_FUNCTION}` and `${SYNC_MEDIA_FUNCTION}`.
    - Replace duplicate logic with `syncMediaElement(el, t)`.
  - `dom-scanner.ts`:
    - In `scanForAudioTracks`, inject `${PARSE_MEDIA_ATTRIBUTES_FUNCTION}`.
    - Use `parseMediaAttributes(el)` to populate `AudioTrackConfig`.

#### 4. Test Plan
- **Verification**: Run `npm run test` which executes the full verification suite.
- **Specific Tests**:
  - `tests/verify-cdp-media-offsets.ts`
  - `tests/verify-seek-driver-offsets.ts`
  - `tests/verify-video-loop.ts`
  - `tests/verify-visual-playback-rate.ts`
  - `tests/verify-dom-media-attributes.ts`
- **Success Criteria**: All verification scripts pass. The logic remains functionally equivalent but centralized.
