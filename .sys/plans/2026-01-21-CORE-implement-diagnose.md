# Plan: Implement Helios.diagnose()

## 1. Context & Goal
- **Objective**: Implement the `Helios.diagnose()` static method to verify environment capabilities (WAAPI, WebCodecs, Canvas).
- **Trigger**: Documented vision in `README.md` ("GPU Acceleration: A Foundational Requirement") lists this as a feature.
- **Impact**: Provides developers with a tool to verify WAAPI, WebCodecs, and Canvas support, improving the debugging experience and ensuring the environment is suitable for rendering.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
    - Add `DiagnosticsReport` interface.
    - Add `static diagnose(): DiagnosticsReport` method to `Helios` class.
- **Modify**: `packages/core/src/index.test.ts`
    - Add unit tests for `Helios.diagnose()` to verify it reports correct capabilities in mocked environments.

## 3. Implementation Spec
- **Architecture**:
    - The `diagnose` method will be a **static** method on the `Helios` class, allowing it to be called without instantiating the engine (e.g., `Helios.diagnose()`).
    - It will return a `DiagnosticsReport` object containing boolean flags for supported features and a list of warnings.
    - It must be isomorphic-safe (checks for `window`/`document` existence before accessing them to avoid crashing in Node.js).

- **Public API Changes**:
    - **New Interface**:
      ```typescript
      export interface DiagnosticsReport {
        waapi: boolean;      // Web Animations API support
        webCodecs: boolean;  // VideoEncoder/VideoFrame support
        canvas: boolean;     // HTMLCanvasElement support
        offscreenCanvas: boolean; // OffscreenCanvas support
        userAgent: string;   // Browser user agent string (or 'node')
        warnings: string[];  // Human-readable warnings for missing features
      }
      ```
    - **New Method**: `static diagnose(): DiagnosticsReport` in `Helios` class.

- **Pseudo-Code**:
  ```typescript
  static diagnose(): DiagnosticsReport {
    const report = {
      waapi: false,
      webCodecs: false,
      canvas: false,
      offscreenCanvas: false,
      userAgent: 'unknown',
      warnings: []
    };

    // Check Environment (Browser vs Node)
    if (typeof window !== 'undefined') {
       report.userAgent = window.navigator.userAgent;
    } else {
       report.userAgent = 'node';
       report.warnings.push('Running in non-browser environment.');
    }

    // Check WAAPI
    if (typeof document !== 'undefined' && typeof document.timeline !== 'undefined' && typeof Element.prototype.animate === 'function') {
      report.waapi = true;
    } else {
      report.warnings.push('Web Animations API (WAAPI) not supported.');
    }

    // Check WebCodecs
    if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
      report.webCodecs = true;
    } else {
      report.warnings.push('WebCodecs API not supported.');
    }

    // Check Canvas
    if (typeof HTMLCanvasElement !== 'undefined') {
      report.canvas = true;
    } else {
      report.warnings.push('HTMLCanvasElement not supported.');
    }

    // Check OffscreenCanvas
    if (typeof OffscreenCanvas !== 'undefined') {
      report.offscreenCanvas = true;
    }

    return report;
  }
  ```

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
    - New tests in `index.test.ts` pass.
    - Tests should simulate different environments (Node-like, Browser with full support, Browser with partial support) using `vi.stubGlobal` and verify the `DiagnosticsReport` output matches expected flags.
- **Edge Cases**:
    - Running in Node.js (should not throw, should report false for browser APIs).
    - Browser missing WebCodecs (e.g., older Safari/Firefox).
