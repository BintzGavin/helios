# Plan: Automated Client-Side Export Verification

## 1. Context & Goal
- **Objective**: Create an automated E2E test to verify the `examples/client-export-api` correctly generates and downloads a video file using the client-side WebCodecs pipeline.
- **Trigger**: Vision gap identified—"Client-Side WebCodecs as Primary Export" is a core feature but lacks proper E2E verification (current "test" is a manual Python script).
- **Impact**: Ensures the primary export path remains functional and regression-free across updates to `@helios-project/player` and core libraries.

## 2. File Inventory
- **Create**: `tests/e2e/verify-client-export.ts` (The new E2E test script)
- **Delete**: `verify_client_export.py` (Deprecated manual script)
- **Read-Only**: `examples/client-export-api/index.html`, `vite.build-example.config.js`

## 3. Implementation Spec
- **Architecture**:
  - Use `playwright` (Chromium) to simulate a user.
  - Start a lightweight Node.js HTTP server (using `http` module) to serve the built artifacts.
  - **Serve Path**: `output/example-build` (Confirmed via `grep "outDir" vite.build-example.config.js`).
  - **Test Path**: `/examples/client-export-api/index.html` (Preserved directory structure confirmed by `tests/e2e/verify-render.ts` patterns).
  - Serve with correct MIME types (`text/html`, `application/javascript`) to ensure ES modules load.
  - Use a random available port to avoid conflicts.
- **Pseudo-Code**:
  ```typescript
  import { chromium } from 'playwright';
  import http from 'http';
  // ... imports

  async function serve(dir) {
     // Start http server on random port
     // Serve static files from dir with mime types
     // Return url and server instance
  }

  async function test() {
     // 1. Start server serving 'output/example-build'
     // 2. Launch browser
     // 3. Navigate to /examples/client-export-api/index.html
     // 4. Click #export-btn
     // 5. Wait for download event
     // 6. Verify download.path() exists and size > 0
     // 7. Cleanup
  }
  ```
- **Dependencies**:
  - Depends on `npm run build:examples` being run before the test (will be part of Verification step).
  - Uses `@playwright/test` (already in devDependencies).

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` (Generates `output/example-build`)
  2. Run `npx tsx tests/e2e/verify-client-export.ts`
- **Success Criteria**:
  - Script logs "✅ Client Export Verified Successfully".
  - A video file is successfully downloaded and validated (size > 0).
- **Edge Cases**:
  - Timeout handling if export hangs.
  - Server startup failure.
