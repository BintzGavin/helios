#### 1. Context & Goal
- **Objective**: Decouple `@helios-project/player` from `@helios-project/core` runtime dependency to fix UMD builds.
- **Trigger**: The current UMD build (`helios-player.global.js`) expects a global `HeliosCore` variable because `vite.config.ts` externalizes it, but `controllers.ts` uses `Helios.diagnose()` as a value, creating a hard runtime dependency that breaks standalone usage (e.g., via CDN).
- **Impact**: Enables truly drop-in usage of the player web component without needing to load the entire core library separately.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Remove value import of `Helios`, refactor `diagnose`)
- **Modify**: `packages/player/src/index.ts` (Ensure type-only imports from core)
- **Modify**: `packages/player/vite.config.ts` (Remove `external` and `globals` config)
- **Read-Only**: `packages/player/src/features/audio-utils.ts` (Verify type-only usage)

#### 3. Implementation Spec
- **Architecture**:
  - The player should treat `@helios-project/core` as a Type-Only dependency.
  - Runtime access to `Helios` logic (like `diagnose`) should be done via the `instance` provided to `DirectController` (which comes from the host/iframe environment) rather than importing the class directly.
- **Pseudo-Code**:
  - In `controllers.ts`:
    - Change `import { Helios ... }` to `import type { Helios ... }`.
    - In `DirectController.diagnose()`:
      - Instead of `return Helios.diagnose()`, use `return (this.instance.constructor as any).diagnose()`.
  - In `index.ts`:
    - Change `import { Helios ... }` to `import type { Helios ... }`.
  - In `vite.config.ts`:
    - Remove `'@helios-project/core'` from `build.rollupOptions.external`.
    - Remove `globals: { '@helios-project/core': 'HeliosCore' }`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player`.
  - Check `packages/player/dist/helios-player.global.js`.
  - Verify that the string `HeliosCore` is NOT present (indicating no external dependency).
  - Verify that the file size is small (e.g., < 100KB gzipped, or similar to before), indicating `core` was not bundled.
  - Run `npm test -w packages/player` to ensure no regressions.
- **Success Criteria**:
  - Build succeeds.
  - UMD bundle does not require `HeliosCore`.
  - Tests pass.
