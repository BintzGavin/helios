# Plan: Decouple TimeDriver from DOM and Sync Version

#### 1. Context & Goal
- **Objective**: Decouple `TimeDriver` and `Helios` from strict `HTMLElement | Document` types to enable Web Worker and OffscreenCanvas support, and sync the package version.
- **Trigger**: "Headless Logic Engine" vision requires platform-agnostic types. "Client-Side WebCodecs" roadmap relies on Worker support for performance. `package.json` version (4.1.0) is out of sync with status (5.0.0).
- **Impact**: Enables `Helios` to run in Web Workers (for background export) and with `OffscreenCanvas` (for high-performance rendering) without type hacks. Syncs version history to clear confusion.

#### 2. File Inventory
- **Create**:
  - `packages/core/src/worker-runtime.test.ts` (New test for worker environment)
- **Modify**:
  - `packages/core/src/drivers/TimeDriver.ts` (Relax `init` type signature)
  - `packages/core/src/drivers/DomDriver.ts` (Add runtime type check)
  - `packages/core/src/drivers/NoopDriver.ts` (Relax `init` type signature)
  - `packages/core/src/Helios.ts` (Relax `animationScope` type, remove DOM defaults)
  - `packages/core/package.json` (Bump version to 5.0.1)
  - `packages/core/src/index.ts` (Update VERSION constant)
- **Read-Only**:
  - `packages/core/src/drivers/index.ts`

#### 3. Implementation Spec
- **Architecture**:
  - **Decoupling**: Update `TimeDriver` interface to use `scope: unknown` (or `any` to avoid TS friction, but `unknown` is safer). This removes the implicit dependency on DOM types in the interface.
  - **Runtime Safety**: In `DomDriver`, explicit checks (`scope instanceof HTMLElement` or `scope instanceof Document`) ensure safety. If check fails, `DomDriver` should warn and behave as Noop (or throw, but warning is preferred for mixed environments).
  - **Clean Defaults**: `Helios` constructor currently defaults `animationScope` to `{} as Document`. This will be changed to `undefined` if `document` is missing.
- **Pseudo-Code**:
  ```typescript
  // TimeDriver.ts
  export interface TimeDriver {
    init(scope: unknown): void;
    // ...
  }

  // DomDriver.ts
  init(scope: unknown) {
    if (typeof HTMLElement !== 'undefined' && (scope instanceof HTMLElement || scope instanceof Document)) {
       this.scope = scope;
       // ...
    } else {
       console.warn('DomDriver initialized with invalid scope', scope);
    }
  }

  // Helios.ts
  private animationScope?: unknown;
  // Constructor
  this.animationScope = options.animationScope ?? (typeof document !== 'undefined' ? document : undefined);
  ```
- **Public API Changes**:
  - `TimeDriver.init` accepts `unknown`.
  - `HeliosOptions.animationScope` accepts `unknown`.
  - `VERSION` export updated to `5.0.1`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/core` to ensure no regressions.
  - Run `npx vitest packages/core/src/worker-runtime.test.ts`.
- **Success Criteria**:
  - `worker-runtime.test.ts` passes (confirming `Helios` works with no global `document`).
  - `DomDriver` still works for existing tests (DOM environment).
  - Version is `5.0.1`.
- **Edge Cases**:
  - Passing a non-DOM object to `DomDriver` (should warn, not crash).
  - Initializing `Helios` in Node.js (should work with `NoopDriver`).
