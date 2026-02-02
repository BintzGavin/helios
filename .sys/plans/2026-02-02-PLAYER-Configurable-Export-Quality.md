# Plan: Configurable Export Quality for Helios Player

## 1. Context & Goal
- **Objective**: Implement configurable video export quality via `export-quality` (preset) and `export-bitrate` (explicit) attributes on `<helios-player>`.
- **Trigger**: The current export implementation hardcodes the bitrate to 5Mbps, which causes artifacts in 4K exports and wasted bandwidth for small previews.
- **Impact**: Unlocks professional-grade high-resolution exports and efficient low-bandwidth previews.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add `export-quality`, `export-bitrate` attributes and pass to exporter)
- **Modify**: `packages/player/src/features/exporter.ts` (Implement bitrate calculation logic)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Add unit tests for bitrate calculation and new options)

## 3. Implementation Spec
- **Architecture**:
  - Update `HeliosPlayer` to observe `export-quality` and `export-bitrate`.
  - Update `ClientSideExporter.export()` interface to accept `bitrate` (number).
  - In `exporter.ts`, calculate target bitrate if not explicitly provided:
    - Formula: `bitrate = width * height * fps * bpp`
    - BPP (Bits Per Pixel) Mapping:
      - `low`: 0.05
      - `medium`: 0.1 (default)
      - `high`: 0.2
      - `extreme`: 0.3
- **Public API Changes**:
  - `<helios-player>` attributes:
    - `export-quality`: "low" | "medium" | "high" | "extreme" (default: "medium")
    - `export-bitrate`: number (bits per second, overrides quality)
  - `HeliosPlayer` properties:
    - `exportQuality`: string
    - `exportBitrate`: number
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test` in `packages/player`.
- **Success Criteria**:
  - `exporter.test.ts` verifies that `VideoSampleSource` receives the correct bitrate for different quality settings.
  - `exporter.test.ts` verifies that `export-bitrate` overrides `export-quality`.
  - Existing tests pass.
- **Edge Cases**:
  - Invalid `export-quality` string (fallback to medium).
  - `export-bitrate` set to 0 or negative (fallback to default calculation).
