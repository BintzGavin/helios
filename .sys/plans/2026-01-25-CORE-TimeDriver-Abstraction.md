# 1. Context & Goal
- **Objective**: Decouple time synchronization logic from the main `Helios` class by introducing a `TimeDriver` interface.
- **Trigger**: "Architecture Hardening" goal in README ("Introduce a `TimeDriver` interface").
- **Impact**: Enables cleaner separation between the Logic Engine (`Helios`) and the Environment (WAAPI, CDP, etc.). Simplifies testing and future-proofs against browser API changes.

# 2. File Inventory
- **Create**:
    - `packages/core/src/drivers/TimeDriver.ts`: Interface definition.
    - `packages/core/src/drivers/WaapiDriver.ts`: Implementation using Web Animations API (extracting existing logic).
    - `packages/core/src/drivers/NoopDriver.ts`: Implementation that does nothing (for production/manual modes).
    - `packages/core/src/drivers/index.ts`: Barrel file.
- **Modify**:
    - `packages/core/src/index.ts`: Refactor `Helios` to use `TimeDriver`. Deprecate `autoSyncAnimations` internal logic (map it to Driver selection).
    - `packages/core/src/index.test.ts`: Update tests to verify Driver interaction or ensure back-compat.
- **Read-Only**:
    - `packages/core/src/animation.ts`

# 3. Implementation Spec
- **Architecture**: Strategy Pattern. `Helios` delegates environment synchronization to a `TimeDriver` instance.
- **Pseudo-Code**:
    ```typescript
    // drivers/TimeDriver.ts
    export interface TimeDriver {
      init(scope: HTMLElement | Document): void;
      update(timeInMs: number): void;
    }

    // drivers/WaapiDriver.ts
    export class WaapiDriver implements TimeDriver {
      update(time) {
        // ... existing syncDomAnimations logic ...
      }
    }

    // index.ts
    import { TimeDriver, WaapiDriver, NoopDriver } from './drivers';

    export interface HeliosOptions {
        // ...
        driver?: TimeDriver;
    }

    export class Helios {
      private driver: TimeDriver;

      constructor(options: HeliosOptions) {
        // ...
        // Backward compat:
        if (options.driver) {
          this.driver = options.driver;
        } else if (options.autoSyncAnimations) {
          this.driver = new WaapiDriver();
        } else {
          this.driver = new NoopDriver();
        }

        this.driver.init(this.animationScope);
      }

      seek(frame) {
        // ... set state ...
        this.driver.update(time);
      }
    }
    ```
- **Public API Changes**:
    - `HeliosOptions` adds optional `driver: TimeDriver`.
    - `autoSyncAnimations` is preserved for backward compatibility but effectively selects the `WaapiDriver`.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - Existing tests pass (Regression testing).
    - New tests verify that providing a custom Mock Driver results in it being called on `seek`.
- **Edge Cases**:
    - `autoSyncAnimations: false` should result in no WAAPI calls.
    - `driver` + `autoSyncAnimations` conflict? `driver` takes precedence.
- **Pre-Commit**: Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
