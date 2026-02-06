#### 1. Context & Goal
- **Objective**: Remove hard runtime dependency on `@helios-project/core` in `packages/player` to ensure the UMD build (`helios-player.global.js`) works in standalone environments (CDNs) where `HeliosCore` global is missing.
- **Trigger**: Analysis of `vite.config.ts` reveals that `@helios-project/core` is externalized, which requires a global variable in UMD builds. This prevents `<helios-player>` from being used as a standalone drop-in component.
- **Impact**: Enables `<helios-player>` to be a true drop-in Web Component without requiring external script dependencies, simplifying integration for non-bundler users.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/controllers.ts`: Change imports to `import type` and refactor `diagnose()` to use `this.instance.constructor`.
  - `packages/player/src/bridge.ts`: Change imports to `import type` and refactor `HELIOS_DIAGNOSE` handler to use `helios.constructor`.
  - `packages/player/src/index.ts`: Change imports to `import type`.
  - `packages/player/src/features/audio-utils.ts`: Change imports to `import type`.
  - `packages/player/src/features/exporter.ts`: Change imports to `import type`.
- **Read-Only**: `packages/player/src/controllers.test.ts`, `packages/player/vite.config.ts`.

#### 3. Implementation Spec
- **Architecture**: Switch all imports from `@helios-project/core` to `import type`. This ensures that the build output does not generate runtime `require` or global variable access for `@helios-project/core`.
- **Logic Changes**:
  - In `DirectController.diagnose()`: Replace `Helios.diagnose()` with `(this.instance.constructor as any).diagnose()`.
  - In `bridge.ts`: Replace `Helios.diagnose()` with `(helios.constructor as any).diagnose()`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player` to ensure compilation and bundling succeed.
  - Inspect `packages/player/dist/helios-player.global.js` (using `grep`) to ensure it does not contain references to `HeliosCore`.
  - Run `npm test -w packages/player` to ensure unit tests still pass.
- **Success Criteria**: Build succeeds, tests pass, and UMD bundle is free of `HeliosCore` global dependency.
- **Edge Cases**: None.
