# Plan: Expose Environment Diagnostics in Player Controller

## 1. Context & Goal
- **Objective**: Add a `diagnose()` method to the `HeliosController` interface and implement it in both `DirectController` and `BridgeController` to expose the environment's capabilities (WebCodecs, WebGL, etc.) to the host.
- **Trigger**: The `README.md` emphasizes "Diagnostics for AI Environments" via `Helios.diagnose()` (verified via `grep` to exist in docs and code), but this capability is currently locked inside the iframe/environment and not accessible to the parent (Player/Studio/Agent) via the controller.
- **Impact**: Enables agents and the Studio to programmatically verify if the rendering environment supports necessary features (like specific codecs or hardware acceleration) without injecting scripts. This directly supports the "Agent Experience First" principle.

## 2. File Inventory
- **Create**: None.
- **Modify**:
    - `packages/player/src/controllers.ts`: Update interface to include `diagnose(): Promise<DiagnosticReport>` and implement in classes. (Verified `DiagnosticReport` is exported from `packages/core/src/Helios.ts` via grep).
    - `packages/player/src/bridge.ts`: Handle `HELIOS_DIAGNOSE` message in the iframe.
    - `packages/player/src/controllers.test.ts`: Add unit tests for `diagnose()` in both controllers.
- **Read-Only**: `packages/core/src/Helios.ts`.

## 3. Implementation Spec
- **Architecture**:
    - **Interface**: Add `diagnose(): Promise<DiagnosticReport>` to `HeliosController`.
    - **DirectController**: Call `(this.instance.constructor as typeof Helios).diagnose()`. Verified `DirectController` has public `instance` property.
    - **BridgeController**: Send `HELIOS_DIAGNOSE` message to the iframe. The iframe's bridge listener calls `Helios.diagnose()` and replies with `HELIOS_DIAGNOSE_RESULT` containing the report.
- **Pseudo-Code**:
    ```typescript
    // packages/player/src/controllers.ts
    import { DiagnosticReport } from "@helios-project/core";

    export interface HeliosController {
      // ...
      diagnose(): Promise<DiagnosticReport>;
    }

    export class DirectController implements HeliosController {
      // ...
      async diagnose() {
        // Access static method from instance constructor to use the correct Helios class reference
        return (this.instance.constructor as any).diagnose();
      }
    }

    export class BridgeController implements HeliosController {
      // ...
      async diagnose(): Promise<DiagnosticReport> {
         return new Promise((resolve) => {
             // standard bridge promise pattern with timeout (similar to getSchema)
             // send HELIOS_DIAGNOSE
             // wait for HELIOS_DIAGNOSE_RESULT
         });
      }
    }

    // packages/player/src/bridge.ts
    // In message listener:
    case 'HELIOS_DIAGNOSE':
      const report = await Helios.diagnose();
      window.parent.postMessage({ type: 'HELIOS_DIAGNOSE_RESULT', report }, '*');
      break;
    ```
- **Public API Changes**: `HeliosController` interface expands. This affects consumers of the interface (e.g. `HeliosPlayer` which exposes `getController()`).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
    - New tests in `controllers.test.ts` pass.
    - `DirectController` returns a report with expected structure (mocked).
    - `BridgeController` successfully round-trips the request via mocked `postMessage`.
- **Edge Cases**:
    - Timeout if bridge doesn't reply (handled by timeout logic).
- **Pre-Commit**:
    - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
