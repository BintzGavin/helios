# Context & Goal
- **Objective**: Expose the `fadeEasing` property in `AudioTrackMetadata` discovered by `DomDriver` via `data-helios-fade-easing`.
- **Trigger**: Vision gap where `DomDriver` supports non-linear fades internally, but this configuration is hidden from the `availableAudioTracks` signal, preventing external renderers from replicating the behavior.
- **Impact**: Enables the Renderer (and other consumers) to access the full audio fade configuration, ensuring WYSIWYG parity between the browser preview and the final render.

# File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `fadeEasing` to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Extract attribute, update observer)
- **Modify**: `packages/core/src/drivers/DomDriver-metadata.test.ts` (Add test cases)

# Implementation Spec
- **Architecture**: Extend the existing Metadata Discovery mechanism in `DomDriver` to parse and propagate the easing configuration.
- **Pseudo-Code**:
  - In `packages/core/src/drivers/TimeDriver.ts`:
    - Add `fadeEasing?: string` to `AudioTrackMetadata` interface.
  - In `packages/core/src/drivers/DomDriver.ts`:
    - In `rebuildDiscoveredTracks`:
      - Read `data-helios-fade-easing` attribute using `getAttribute`.
      - Include it in the constructed metadata object if present.
    - In `addScope` (MutationObserver):
      - Add `'data-helios-fade-easing'` to the `attributeFilter` array to trigger updates on change.
- **Public API Changes**:
  - `AudioTrackMetadata`: Add optional `fadeEasing?: string` property.
- **Dependencies**: None.

# Test Plan
- **Verification**: Run `npm test packages/core/src/drivers/DomDriver-metadata.test.ts`
- **Success Criteria**:
  - New test case "should discover fade easing metadata" passes.
  - New test case "should update metadata when fade easing attribute changes" passes.
  - Existing tests pass (regression check).
- **Edge Cases**:
  - Attribute missing (should be undefined).
  - Attribute present but empty string (should match `getAttribute` behavior, likely empty string or treat as undefined if desired, but passing through string is safest).
