# RENDERER: Refactor Media Discovery Logic

#### 1. Context & Goal
- **Objective**: Consolidate duplicate "find all media" and "find all scopes" logic (Shadow DOM traversal) into a single source of truth to reduce maintenance risk and ensure consistency.
- **Trigger**: Identified duplications in `DomScanner`, `CdpTimeDriver`, and `SeekTimeDriver` (documented in `.jules/RENDERER.md`).
- **Impact**: Ensures consistent media handling across Canvas and DOM rendering strategies and simplifies future DOM traversal updates.

#### 2. File Inventory
- **Create**: `packages/renderer/src/utils/dom-scripts.ts`
- **Modify**:
  - `packages/renderer/src/utils/dom-scanner.ts`
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`
- **Read-Only**: `packages/renderer/src/utils/dom-finder.ts` (reference)

#### 3. Implementation Spec
- **Architecture**: Shared Script Pattern. Extract the JavaScript function definitions as string constants to be interpolated into `page.evaluate` contexts.
- **Pseudo-Code**:
  - `dom-scripts.ts`:
    - Export `FIND_ALL_MEDIA_FUNCTION` string constant (contains the `findAllMedia` function definition).
    - Export `FIND_ALL_SCOPES_FUNCTION` string constant (contains the `findAllScopes` function definition).
  - `dom-scanner.ts`: Import `FIND_ALL_MEDIA_FUNCTION` and inject it into the `scanForAudioTracks` script string.
  - `CdpTimeDriver.ts`: Import `FIND_ALL_MEDIA_FUNCTION` and inject it into the `mediaSyncScript` string.
  - `SeekTimeDriver.ts`: Import `FIND_ALL_MEDIA_FUNCTION` and `FIND_ALL_SCOPES_FUNCTION` and inject them into the `setTime` script string.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the specific verification scripts that rely on media discovery logic to ensure no regression.
  - Command: `npm run test` (or `npm run test packages/renderer/tests/verify-cdp-iframe-media-sync.ts packages/renderer/tests/verify-video-loop.ts packages/renderer/tests/verify-shadow-dom-sync.ts`)
- **Success Criteria**: All verification scripts pass.
- **Edge Cases**:
  - Nested Shadow DOMs (covered by existing logic).
  - Iframes (covered by existing logic).
  - Dynamic media elements (covered by existing logic).
