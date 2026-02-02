# 2026-02-02-PLAYER-expose-composition-setters.md

#### 1. Context & Goal
- **Objective**: Expose `setDuration`, `setFps`, `setSize`, and `setMarkers` methods in the `HeliosController` interface and Bridge protocol.
- **Trigger**: The current Player API allows controlling playback and audio, but lacks methods to dynamically update the composition's structure (duration, resolution, frame rate, markers). This blocks "Editor" use cases (like Helios Studio) from updating the preview without reloading the iframe.
- **Impact**: Enables dynamic composition updates in the Player, improving the Agent Experience (AX) and User Experience for editor-like applications.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Update interface and both controller implementations)
- **Modify**: `packages/player/src/bridge.ts` (Update message handler to call new methods on Helios instance)
- **Modify**: `packages/player/src/controllers.test.ts` (Add unit tests for new methods)
- **Modify**: `packages/player/src/bridge.test.ts` (Add unit tests for new message handling)
- **Read-Only**: `packages/core/src/Helios.ts` (Reference for method signatures)

#### 3. Implementation Spec
- **Architecture**: Extend the existing Bridge/Controller pattern. No new architectural components.
- **Public API Changes**: `HeliosController` interface adds:
    - `setDuration(seconds: number): void`
    - `setFps(fps: number): void`
    - `setSize(width: number, height: number): void`
    - `setMarkers(markers: Marker[]): void`
- **Bridge Protocol Changes**: New message types:
    - `HELIOS_SET_DURATION` (payload: `duration`)
    - `HELIOS_SET_FPS` (payload: `fps`)
    - `HELIOS_SET_SIZE` (payload: `width`, `height`)
    - `HELIOS_SET_MARKERS` (payload: `markers`)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**: All tests pass, including new tests verifying that calling the controller methods triggers the corresponding Helios instance methods (Direct) or sends the correct postMessage (Bridge).
- **Edge Cases**:
    - Invalid inputs (negative duration/fps/size) are handled by Core, but Bridge should forward them blindly or validate? Core validates, so forwarding is fine.
    - Check that `setMarkers` handles empty arrays.
