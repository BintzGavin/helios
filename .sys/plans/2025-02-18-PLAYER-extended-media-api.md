# 1. Context & Goal
- **Objective**: Implement missing read-only properties (`videoWidth`, `videoHeight`, `buffered`, `seekable`, `seeking`) on `<helios-player>` to achieve fuller compatibility with the `HTMLMediaElement` interface.
- **Trigger**: Journal entry v0.32.0 identified that libraries check these properties before interacting with the player.
- **Impact**: Enables `<helios-player>` to be used as a drop-in replacement in video wrapping libraries (like React Player, Video.js adapters, etc.) that expect a standard media element interface.

# 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Implement getters)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification tests)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for state)

# 3. Implementation Spec
- **Architecture**: Add standard getters to the `HeliosPlayer` class. These will derive values from the internal `controller` state or return standard fallback objects (for `TimeRanges`).
- **Public API Changes**:
  - `get videoWidth(): number` - Returns `state.width` or `0`.
  - `get videoHeight(): number` - Returns `state.height` or `0`.
  - `get buffered(): TimeRanges` - Returns a pseudo-TimeRanges object covering `[0, duration]`.
  - `get seekable(): TimeRanges` - Returns a pseudo-TimeRanges object covering `[0, duration]`.
  - `get seeking(): boolean` - Returns `false` (synchronous seek assumption) or potentially maps to internal scrub state if applicable.
- **Logic**:
  - **`videoWidth`/`videoHeight`**: Access `this.controller.getState().width/height`. If unavailable, default to `0`.
  - **`buffered`/`seekable`**: Return an object matching the `TimeRanges` interface:
    ```javascript
    {
      length: 1,
      start: (index) => 0,
      end: (index) => this.duration
    }
    ```
    *Note: Check if `duration` is valid (not NaN) and greater than 0, otherwise return empty range (length 0).*
  - **`seeking`**: Return `false`. Helios renders synchronously enough for this purpose, and we stay in `HAVE_ENOUGH_DATA`.

# 4. Test Plan
- **Verification**: Run `npm test packages/player/src/api_parity.test.ts`.
- **Success Criteria**:
  - `videoWidth` and `videoHeight` return numbers.
  - `buffered` and `seekable` return objects with `length`, `start()`, `end()` methods.
  - `seeking` returns a boolean.
- **Edge Cases**:
  - Controller not connected (`videoWidth` should be 0).
  - Duration is 0 (`buffered` should be empty or 0-0).
  - JSDOM environment compatibility for `TimeRanges` (duck typing).
