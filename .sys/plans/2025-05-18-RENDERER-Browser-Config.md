# Plan: Enable Browser Launch Configuration

## 1. Context & Goal
- **Objective**: Add `browserConfig` to `RendererOptions` to allow customizing Playwright browser launch arguments (e.g. `headless`, `executablePath`, `args`).
- **Trigger**: Vision gap: README implies "Containerized Rendering" (Docker) and "Headed Mode" (Debugging), but `Renderer` class hardcodes launch args and headless mode.
- **Impact**: Unblocks Docker deployment (requires `--no-sandbox`) and improves developer experience (debugging).

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `BrowserConfig` interface and `browserConfig` property)
- **Modify**: `packages/renderer/src/index.ts` (Update `Renderer` class to use configuration)
- **Create**: `packages/renderer/tests/verify-browser-config.ts` (New verification script)

## 3. Implementation Spec
- **Architecture**: The `Renderer` class will accept a `browserConfig` object in its constructor options. This configuration will be passed to `chromium.launch` during `render()` and `diagnose()`. Default arguments (like GPU flags) will be preserved but merged with user arguments.

- **Public API Changes**:
  - `packages/renderer/src/types.ts`:
    ```typescript
    export interface BrowserConfig {
      headless?: boolean;
      executablePath?: string;
      args?: string[];
    }

    export interface RendererOptions {
      // ... existing options
      browserConfig?: BrowserConfig;
    }
    ```

- **Pseudo-Code**:
  ```typescript
  // packages/renderer/src/index.ts

  // Default args (moved to a constant)
  const DEFAULT_BROWSER_ARGS = [
    '--use-gl=egl',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--enable-zero-copy',
    '--disable-web-security',
    '--allow-file-access-from-files',
  ];

  class Renderer {
    // ...
    private getLaunchOptions() {
      const config = this.options.browserConfig || {};
      const userArgs = config.args || [];
      return {
        headless: config.headless ?? true, // Default to true
        executablePath: config.executablePath,
        args: [...DEFAULT_BROWSER_ARGS, ...userArgs],
      };
    }

    public async diagnose() {
      const launchOptions = this.getLaunchOptions();
      const browser = await chromium.launch(launchOptions);
      // ...
    }

    public async render() {
      const launchOptions = this.getLaunchOptions();
      const browser = await chromium.launch(launchOptions);
      // ...
    }
  }
  ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-browser-config.ts`
- **Success Criteria**:
  - The script instantiates `Renderer` with `{ browserConfig: { args: ['--user-agent=HeliosTestAgent'] } }`.
  - Calls `renderer.diagnose()`.
  - Asserts that `result.browser.userAgent` contains "HeliosTestAgent".
- **Edge Cases**:
  - `browserConfig` is undefined (should use defaults).
  - `headless: false` (manual verification if possible, or check launch options via mock if we were unit testing, but for integration test, we rely on logic).
