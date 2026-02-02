# 📋 Plan: Enable Configurable Export Bitrate

## 1. Context & Goal
- **Objective**: Implement a new `export-bitrate` attribute on the `<helios-player>` component to allow users to control the quality/file size of client-side video exports.
- **Trigger**: Journal entry `[v0.58.0] - Export Bitrate Configuration` identified this as a planned/missing feature. Currently, the bitrate is hardcoded to 5 Mbps.
- **Impact**: Enables users to generate higher quality exports (for production) or smaller files (for preview/web) by adjusting the encoding bitrate.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Add `export-bitrate` to `observedAttributes`.
  - Parse the attribute and pass it to the exporter.
- **Modify**: `packages/player/src/features/exporter.ts`
  - Update `export()` method signature to accept a `bitrate` option.
  - Apply the bitrate to the `VideoEncodingConfig`.
- **Modify**: `packages/player/src/features/exporter.test.ts`
  - Add a unit test to verify the bitrate is correctly passed to the `VideoSampleSource` constructor.

## 3. Implementation Spec
- **Architecture**:
  - Extend the `ClientSideExporter.export` options interface to include `bitrate?: number`.
  - In `HeliosPlayer`, read `export-bitrate`. If present, parse as integer. Default is undefined (letting Exporter handle the default or falling back to 5Mbps).
- **Public API Changes**:
  - New attribute: `export-bitrate` (number, in bits per second).
- **Logic**:
  - In `exporter.ts`, `videoConfig` will use `options.bitrate ?? 5_000_000`.
  - The `VideoEncodingConfig` type in `mediabunny` already supports `bitrate` (verified by usage in existing code).

## 4. Test Plan
- **Verification**: Run `npm test -w packages/player` and complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
- **Success Criteria**:
  - The new test case `should respect custom bitrate configuration` passes.
  - Existing tests pass without regression.
- **Edge Cases**:
  - Invalid/Non-numeric bitrate: Should fallback to default.
  - Zero/Negative bitrate: Should be handled safely (likely clamped or ignored by `VideoEncoder`, but we can enforce a minimum).
