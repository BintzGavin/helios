#### 1. Context & Goal
- **Objective**: Refactor the `Helios` class and related types from `index.ts` to a dedicated `Helios.ts` file to improve code organization and maintainability, and synchronize the package version to 3.6.0 to match the documented status.
- **Trigger**: `index.ts` has become bloated (470+ lines) with mixed responsibilities (exports + class definition), and `package.json` version (3.4.0) lags behind `docs/status/CORE.md` (3.6.0).
- **Impact**: Improves codebase navigability, separates concerns, and ensures correct versioning for consumers.

#### 2. File Inventory
- **Create**: `packages/core/src/Helios.ts` (New home for `Helios` class and core types)
- **Modify**: `packages/core/src/index.ts` (Remove class, add export)
- **Modify**: `packages/core/src/render-session.ts` (Update import)
- **Modify**: `packages/core/src/ai.ts` (Update import)
- **Modify**: `packages/core/package.json` (Bump version to 3.6.0)
- **Read-Only**: `packages/core/src/drivers/index.ts`, `packages/core/src/signals.ts`, `packages/core/src/errors.ts`, `packages/core/src/schema.ts`, `packages/core/src/captions.ts`, `packages/core/src/markers.ts`

#### 3. Implementation Spec
- **Architecture**: Move `Helios` class and associated types (`HeliosState`, `HeliosOptions`, `HeliosSubscriber`, `StabilityCheck`, `DiagnosticReport`) to `Helios.ts`. `index.ts` becomes a pure barrel file.
- **Pseudo-Code**:
  - **`src/Helios.ts`**:
    - Import dependencies (`TimeDriver`, `DomDriver`, `signals`, `errors`, `schema`, `captions`, `markers`).
    - Copy `HeliosState`, `AudioTrackState`, `HeliosSubscriber`, `StabilityCheck`, `HeliosOptions`, `DiagnosticReport` definitions.
    - Copy `Helios` class definition.
    - Export all of the above.
  - **`src/index.ts`**:
    - Remove moved code.
    - Add `export * from './Helios.js';`.
  - **`src/render-session.ts`**:
    - Change `import type { Helios } from './index.js';` to `import type { Helios } from './Helios.js';`.
  - **`src/ai.ts`**:
    - Change `import type { Helios } from './index.js';` to `import type { Helios } from './Helios.js';`.
  - **`package.json`**:
    - Update `"version": "3.4.0"` to `"version": "3.6.0"`.

- **Public API Changes**: None (Exports remain available via `index.ts`).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run unit tests to ensure refactor didn't break anything.
  - Command: `npm test -w packages/core`
- **Success Criteria**: All tests pass, specifically `index.test.ts` which tests `Helios` class functionality via `index.js` export.
- **Edge Cases**:
  - Circular dependencies: Verified that `Helios` does not depend on `ai.ts` or `render-session.ts`, so moving it does not create cycles.
  - Type exports: Ensure `HeliosState` and other types are still exported from `index.ts` for consumers.
