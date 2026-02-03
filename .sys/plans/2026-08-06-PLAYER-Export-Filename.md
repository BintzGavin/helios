# Context & Goal
- **Objective**: Implement `export-filename` attribute on `<helios-player>` to allow users to specify the filename for client-side exported videos.
- **Trigger**: Vision gap - users currently cannot customize the download filename (defaults to `video.mp4/webm`).
- **Impact**: Improves UX by allowing descriptive filenames for downloads, essential for workflows involving multiple exports.

# File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `HeliosPlayer` to read attribute and pass to exporter)
- **Modify**: `packages/player/src/features/exporter.ts` (Update `ClientSideExporter` to accept and use filename)
- **Modify**: `packages/player/src/features/exporter.test.ts` (Add unit tests for filename support)
- **Modify**: `packages/player/README.md` (Document the new attribute)

# Implementation Spec
- **Architecture**: Extend `ClientSideExporter.export()` options to include `filename`. Pass this down to `download()`. `HeliosPlayer` observes `export-filename` and passes it during export trigger.
- **Pseudo-Code**:
  - **ClientSideExporter**:
    - Update `export(options)` to include `filename?: string`.
    - In `download(buffer, format)`, accept `filename` argument.
    - If `filename` provided, use `${filename}.${format}`, else `video.${format}`.
  - **HeliosPlayer**:
    - Add `export-filename` to `observedAttributes`.
    - In `renderClientSide`:
      - `const filename = this.getAttribute("export-filename") || "video";`
      - `exporter.export({ ..., filename })`.

# Test Plan
- **Verification**: `npm run build -w packages/player` to ensure types are correct.
- **Unit Test**: In `exporter.test.ts`:
  - Create test "should use custom filename".
  - Call `export({ filename: "custom" })`.
  - Verify `document.createElement("a").download` equals "custom.mp4".
- **Success Criteria**: Unit tests pass and build succeeds.
