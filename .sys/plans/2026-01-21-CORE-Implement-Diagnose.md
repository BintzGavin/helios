# Plan: Implement Helios.diagnose()

#### 1. Context & Goal
- **Objective**: Implement the `Helios.diagnose()` static method to verify environment capabilities (WAAPI, WebCodecs, hardware acceleration hints).
- **Trigger**: Vision Gap. The README explicitly promises a `helios.diagnose()` tool to "combat the common friction of environment configuration" and check for hardware acceleration.
- **Impact**: Provides developers with immediate feedback on their environment's readiness for high-performance rendering (WebCodecs) and animation (WAAPI).

#### 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
  - Add `static async diagnose(): Promise<DiagnosticReport>` to `Helios` class.
  - Add `DiagnosticReport` interface.
- **Read-Only**: `README.md` (Reference for requirements).

#### 3. Implementation Spec
- **Architecture**:
  - The `diagnose` method will be **static** on the `Helios` class, allowing checks before instantiation.
  - It will perform a series of feature detections safely (handling Node.js vs Browser environments).
- **Pseudo-Code**:
  ```typescript
  interface DiagnosticReport {
    waapi: boolean;
    webCodecs: boolean;
    offscreenCanvas: boolean;
    userAgent: string;
  }

  class Helios {
    // ... existing code ...

    static async diagnose(): Promise<DiagnosticReport> {
      const report = {
        waapi: typeof document !== 'undefined' && 'timeline' in document,
        webCodecs: typeof VideoEncoder !== 'undefined',
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
      };

      console.group('Helios Diagnostics');
      console.log('WAAPI Support:', report.waapi ? '✅' : '❌');
      console.log('WebCodecs Support:', report.webCodecs ? '✅' : '❌');
      // ... more logs ...
      if (!report.webCodecs) console.warn('Hardware accelerated rendering requires WebCodecs.');
      console.log('To verify GPU acceleration, please visit: chrome://gpu');
      console.groupEnd();

      return report;
    }
  }
  ```
- **Public API Changes**:
  - `Helios` class now has a static `diagnose` method.
  - Export `DiagnosticReport` type.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Create a temporary test script `test-diagnose.ts` that imports `Helios` and calls `Helios.diagnose()`.
  - Run with `npx ts-node test-diagnose.ts`.
- **Success Criteria**:
  - Output contains "Helios Diagnostics" group.
  - Returns a report object.
  - Does not crash in Node.js environment (where `document` is undefined).
- **Edge Cases**:
  - Run in an environment where `VideoEncoder` is missing (Node.js).
