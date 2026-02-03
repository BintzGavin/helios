# Context & Goal
- **Objective**: Expose the `fadeEasing` property in audio track metadata to support custom audio fade curves (e.g. "quad.in") in headless environments.
- **Trigger**: Vision Gap - `DomDriver` supports `data-helios-fade-easing` for preview, but this metadata is lost in the `availableAudioTracks` signal, preventing the Renderer from applying the correct curve.
- **Impact**: Enables frame-accurate and curve-accurate audio fading in final renders, matching the preview.

# File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Update `AudioTrackMetadata` interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Populate `fadeEasing` in `rebuildDiscoveredTracks`)
- **Modify**: `packages/core/src/drivers/DomDriver-metadata.test.ts` (Verify discovery logic)

# Implementation Spec
- **Architecture**: Extend the `AudioTrackMetadata` interface to include `fadeEasing?: string`. Update `DomDriver` to scrape `data-helios-fade-easing` from DOM elements and include it in the discovered tracks map.
- **Public API Changes**: `AudioTrackMetadata` interface adds optional `fadeEasing` property.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx vitest run packages/core/src/drivers/DomDriver-metadata.test.ts`
- **Success Criteria**: A new test case confirms `fadeEasing` is correctly extracted from the DOM attribute `data-helios-fade-easing`.
- **Edge Cases**: Verify that missing attributes result in `undefined` (or handled gracefully) to keep the object clean.
