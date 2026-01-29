# 1. Context & Goal
- **Objective**: Implement missing Standard Media API properties (`seeking`, `seekable`, `buffered`, `videoWidth`, `videoHeight`) and events (`seeking`, `seeked`) in `<helios-player>`.
- **Trigger**: Incomplete parity with `HTMLMediaElement` identified in status file.
- **Impact**: Enables `<helios-player>` to be used as a drop-in replacement in video libraries that expect these standard properties.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implementation)
- **Modify**: `packages/player/src/api_parity.test.ts` (Verification)

# 3. Implementation Spec
- **Architecture**: Extend `HeliosPlayer` class to include getters for missing properties. Use a private `_seeking` state to track seek status.
- **Pseudo-Code**:
  1.  Define a helper class `SimpleTimeRanges` (implements `TimeRanges`) inside `index.ts`.
      -   `length`: 1 (if duration > 0, else 0)
      -   `start(i)`: 0
      -   `end(i)`: `duration`
  2.  Update `HeliosPlayer` class:
      -   Add private property `_seeking: boolean = false`.
      -   Add getter `seeking`: returns `this._seeking`.
      -   Add getter `buffered`: returns `new SimpleTimeRanges(this.duration)`.
      -   Add getter `seekable`: returns `new SimpleTimeRanges(this.duration)`.
      -   Add getter `played`: returns `new SimpleTimeRanges(this.duration)` (Simplified for now).
      -   Add getter `videoWidth`: returns `this.controller?.getState().width || 0`.
      -   Add getter `videoHeight`: returns `this.controller?.getState().height || 0`.
  3.  Update `handleScrubStart`:
      -   Set `this._seeking = true`.
      -   Dispatch `new Event('seeking')`.
  4.  Update `handleScrubEnd`:
      -   Set `this._seeking = false`.
      -   Dispatch `new Event('seeked')`.
  5.  Update `currentFrame` / `currentTime` setters:
      -   Set `this._seeking = true`.
      -   Dispatch `new Event('seeking')`.
      -   Perform seek.
      -   Set `this._seeking = false`.
      -   Dispatch `new Event('seeked')`.

- **Public API Changes**: New standard getters (`seeking`, `buffered`, `seekable`, `videoWidth`, `videoHeight`, `played`).

# 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - `seeking` is true when scrubbing.
  - `buffered` returns range [0, duration].
  - `videoWidth` returns a number.
  - Events `seeking` and `seeked` are fired during scrubbing and programmatic seeking.
