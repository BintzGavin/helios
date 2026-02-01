#### 1. Context & Goal
- **Objective**: Implement support for `data-helios-fade-in` and `data-helios-fade-out` attributes in `DomDriver` to enable audio fading.
- **Trigger**: Vision Gap - "Advanced Audio Mixing" and Parity with Renderer (which already supports these attributes via `DomScanner`).
- **Impact**: Enables accurate audio fading in the Preview/Player, matching the final render output.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/core/src/drivers/DomDriver.ts`: Update `syncMediaElements` to handle fade logic.
  - `packages/core/src/drivers/DomDriver.test.ts`: Add unit tests for audio fading.
- **Read-Only**:
  - `packages/renderer/src/utils/dom-scanner.ts` (Reference for attribute names)

#### 3. Implementation Spec
- **Architecture**: Extend `DomDriver` to act as a volume mixer that respects fade envelopes defined by DOM attributes.
- **Pseudo-Code**:
  - In `syncMediaElements` loop:
    - Parse `fadeInDuration` from `data-helios-fade-in` (default 0).
    - Parse `fadeOutDuration` from `data-helios-fade-out` (default 0).
    - Calculate `timeRelToStart` = `timeInSeconds - offset`.
    - If `fadeInDuration > 0`:
      - `fadeInMultiplier` = clamp(`timeRelToStart` / `fadeInDuration`, 0, 1).
    - Else `fadeInMultiplier` = 1.
    - If `fadeOutDuration > 0` AND `!isNaN(el.duration)`:
      - `targetTime` = max(0, `timeRelToStart` + `seek`).
      - `timeRemaining` = `el.duration` - `targetTime`.
      - `fadeOutMultiplier` = clamp(`timeRemaining` / `fadeOutDuration`, 0, 1).
    - Else `fadeOutMultiplier` = 1.
    - `effectiveVol` = `baseVol` * `masterVolume` * `trackVol` * `fadeInMultiplier` * `fadeOutMultiplier`.
    - Apply `effectiveVol` to `el.volume`.
- **Public API Changes**: None (Internal behavior update).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/core`.
- **Success Criteria**:
  - `DomDriver.test.ts` passes.
  - New tests for "Audio Fading" confirm volume is reduced during fade-in/out periods.
- **Edge Cases**:
  - `fadeInDuration` = 0 (Should be 1).
  - `fadeOutDuration` = 0 (Should be 1).
  - `el.duration` is NaN (Should skip fade out).
  - Overlapping fades (fade in and fade out overlap) -> Multipliers multiply.
