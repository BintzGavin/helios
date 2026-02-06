# Decouple Core Imports

#### 1. Context & Goal
- **Objective**: Decouple `packages/player` from `@helios-project/core` value imports to enable standalone UMD usage.
- **Trigger**: Journal v0.71.0 - UMD Build Decoupling. The UMD build currently requires a global `HeliosCore` variable because `Helios` is imported as a value.
- **Impact**: Allows `helios-player` to be used as a drop-in script tag (CDN) without requiring the parent page to load `@helios-project/core` separately.

#### 2. File Inventory
- **Modify**: `packages/player/src/controllers.ts` (Change import to type, refactor `diagnose`)
- **Modify**: `packages/player/src/index.ts` (Change import to type)
- **Modify**: `packages/player/src/bridge.ts` (Change import to type, refactor `HELIOS_DIAGNOSE`)
- **Modify**: `packages/player/package.json` (Bump version to 0.71.0)
- **Read-Only**: `packages/player/vite.config.ts` (Verify externalization config)

#### 3. Implementation Spec
- **Architecture**:
  - The `HeliosPlayer` package is designed to be a thin shell around an iframe (which contains the Core).
  - The UMD build explicitly externalizes `@helios-project/core`.
  - Therefore, the source code must strictly use `import type { Helios }` to avoid emitting `require("@helios-project/core")` or expecting `global.HeliosCore` at runtime in the parent context.
  - Access to static methods like `Helios.diagnose()` must be done via the runtime instance's constructor: `(this.instance.constructor as any).diagnose()`.

- **Pseudo-Code**:
  - **controllers.ts**:
    - Change `import { Helios }` to `import type { Helios }`.
    - In `DirectController.diagnose()`:
      ```typescript
      // BEFORE: return Helios.diagnose();
      // AFTER: return (this.instance.constructor as any).diagnose();
      ```
  - **index.ts**:
    - Change `import { Helios }` to `import type { Helios }`.
  - **bridge.ts**:
    - Change `import { Helios }` to `import type { Helios }`.
    - In `connectToParent`:
      - Argument `helios` remains typed as `Helios` (interface).
      - In `case 'HELIOS_DIAGNOSE'`:
        ```typescript
        // BEFORE: const report = await Helios.diagnose();
        // AFTER: const report = await (helios.constructor as any).diagnose();
        ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/player`.
  - Run `npm test -w packages/player`.
- **Success Criteria**:
  - Build passes.
  - All tests pass.
- **Edge Cases**:
  - Ensure `instance` is defined before accessing `constructor` (already handled by types/logic).
