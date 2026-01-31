# Plan: Scaffold Diagnostics Example

## 1. Context & Goal
- **Objective**: Create a new example `examples/diagnostics` that runs `Helios.diagnose()` and renders a system capabilities report to the DOM.
- **Trigger**: Vision gap. The `README.md` mentions `Helios.diagnose()` as a tool for AI environments, but no runnable example exists to easily verify this or debug environment issues.
- **Impact**: Provides a standardized "Sanity Check" URL for agents and users to verify their browser environment supports Helios.

## 2. File Inventory
- **Create**:
  - `examples/diagnostics/composition.html`: The entry point.
  - `examples/diagnostics/src/main.ts`: The TypeScript logic to run diagnostics and render the UI.
  - `examples/diagnostics/tsconfig.json`: TypeScript configuration extending the root config.
  - `examples/diagnostics/README.md`: Documentation for the example.
- **Modify**:
  - `examples/README.md`: Add the new example to the list.
- **Read-Only**:
  - `packages/core/src/index.ts`: Reference for the `DiagnosticReport` interface and `Helios` class.
  - `package.json`: Reference for build and test scripts.

## 3. Implementation Spec
- **Architecture**:
  - **Framework**: Vanilla TypeScript (no UI framework overhead).
  - **Pattern**: Instantiate `Helios`, run `Helios.diagnose()`, render HTML string to a container.
- **Pseudo-Code (`src/main.ts`)**:
  ```typescript
  import { Helios, DiagnosticReport } from '@helios-project/core';

  // 1. Initialize Helios (needed to be a valid composition)
  // autoSyncAnimations ensures it syncs with DOM updates if needed.
  const helios = new Helios({
    duration: 10,
    fps: 30,
    autoSyncAnimations: true
  });

  // 2. DOM Setup
  const app = document.querySelector('#app');
  if (app) {
      app.innerHTML = '<div class="loading">Running System Diagnostics...</div>';
  }

  // 3. Run Diagnostics
  try {
    const report = await Helios.diagnose();
    renderReport(report);
  } catch (err) {
    renderError(err);
  }

  // 4. Render Logic
  function renderReport(report: DiagnosticReport) {
    // Generate structured HTML for:
    // - Core: WebGL, WebCodecs, Web Audio, OffscreenCanvas
    // - Codecs: H.264, VP8, VP9, AV1 (Encode & Decode)
    // - Browser: User Agent
    // Apply green checks (✅) for true, red crosses (❌) for false.
    // Use simple CSS for layout (e.g. grid/flex).

    // Example structure:
    // <div class="section">
    //   <h2>Core</h2>
    //   <ul>
    //     <li>WebGL: ${report.webgl ? '✅' : '❌'}</li>
    //     ...
    //   </ul>
    // </div>
  }

  function renderError(err: any) {
      const app = document.querySelector('#app');
      if (app) app.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: `@helios-project/core`.

## 4. Test Plan
- **Verification**:
  1.  Run `npm run build:examples` to ensure it compiles.
  2.  Run `npm run verify:e2e -- --filter diagnostics` to ensure it passes the verification pipeline (loading and exporting).
- **Success Criteria**:
  - The build succeeds.
  - The E2E test discovers the new example and verifies it (export button appears and download starts).
  - Opening `output/example-build/examples/diagnostics/composition.html` in a browser shows the diagnostic report.
- **Edge Cases**:
  - **Headless Environment**: The report might show failures (e.g., no WebGL). The example should *not crash* or throw errors; it should just render the "False" state validly. The E2E test checks for crashes/timeouts, so this covers it.
