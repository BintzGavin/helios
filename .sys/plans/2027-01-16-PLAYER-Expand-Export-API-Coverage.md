#### 1. Context & Goal
- **Objective**: Implement unit tests for `export-api.test.ts`.
- **Trigger**: Vitest reported 0 tests in `packages/player/src/features/export-api.test.ts`.
- **Impact**: Ensures that the export API functions as expected, maintaining the 100% coverage target for the PLAYER domain.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/src/features/export-api.test.ts`]
- **Read-Only**: [`packages/player/src/index.ts`, `packages/player/src/features/exporter.ts`]

#### 3. Implementation Spec
- **Architecture**: Use `vitest` to write comprehensive unit tests covering the `export()` method on the `HeliosPlayer` element and its interaction with the `ClientSideExporter`.
- **Pseudo-Code**:
  - Add tests validating that the options object correctly parses and forwards `export-width`, `export-height`, `export-bitrate`, `export-caption-mode`, `export-format`, etc.
  - Verify that default DOM attributes are respected when options are omitted.
  - Test abort signal handling and promise rejection on errors.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player -- run src/features/export-api.test.ts`
- **Success Criteria**: Vitest reports all tests pass with 100% coverage for the `export` API interface.
- **Edge Cases**: Ensure missing attributes and missing configuration options do not crash the exporter.
