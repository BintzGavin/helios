# 2025-02-12-RENDERER-Structured-Logging.md

#### 1. Context & Goal
- **Objective**: Replace direct `console.log/warn/error` calls in `Renderer` and strategies with a configurable `Logger` interface to support JSON-RPC integration and structured logging.
- **Trigger**: Memory "Renderer uses console.log... interferes with JSON-RPC over stdout". The current implementation pollutes stdout, breaking protocols that rely on it (like Studio's MCP).
- **Impact**: Enables clean integration with CLI and Studio (preventing protocol corruption), allows consumers to capture/redirect logs (e.g. to files or UI), and improves debuggability via structured levels.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/Logger.ts`: Default `ConsoleLogger` and `Logger` interface.
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `Logger` interface and `logger` option to `RendererOptions`.
  - `packages/renderer/src/Renderer.ts`: Accept `logger` in constructor, resolve default if missing, pass to strategies.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Accept `logger` in constructor, use it for logging.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Accept `logger` in constructor, use it for logging.
- **Read-Only**:
  - `packages/renderer/src/index.ts` (Check exports)
  - `packages/renderer/src/strategies/RenderStrategy.ts` (Interface definition)

#### 3. Implementation Spec
- **Architecture**: Dependency Injection. The `Renderer` resolves a `Logger` instance (defaulting to `ConsoleLogger` which wraps `console`). This logger is passed to strategies via their constructors.
- **Logger Interface** (`src/utils/Logger.ts`):
  ```typescript
  export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }
  export class ConsoleLogger implements Logger {
    debug(msg: string, ...args: any[]) { console.debug(msg, ...args); }
    info(msg: string, ...args: any[]) { console.info(msg, ...args); }
    warn(msg: string, ...args: any[]) { console.warn(msg, ...args); }
    error(msg: string, ...args: any[]) { console.error(msg, ...args); }
  }
  ```
- **Renderer Logic**:
  - Constructor: `this.logger = options.logger || new ConsoleLogger();`
  - Instantiation: `this.strategy = new DomStrategy(this.options, this.logger);` (Requires strategy constructor update)
  - `page.on('console')`: `this.logger.debug('PAGE LOG: ' + msg.text())`
  - `ffmpegProcess.stderr`: `this.logger.debug('ffmpeg: ' + data.toString())`
  - All other `console.log`: replace with `this.logger.info`.
- **Strategies**:
  - Update constructors to accept `logger: Logger`.
  - Replace `console.log` -> `this.logger.info`.
  - Replace `console.warn` -> `this.logger.warn`.
  - Replace `console.error` -> `this.logger.error`.

#### 4. Test Plan
- **Verification**: Create `packages/renderer/tests/verify-logging.ts`.
  - Define `class MockLogger implements Logger` that pushes messages to an array.
  - Instantiate `Renderer` with `MockLogger`.
  - Run `renderer.diagnose()` (fastest way to trigger logs).
  - **Success Criteria**:
    - `MockLogger` array contains specific messages (e.g. "Starting diagnostics").
    - `console.log` (spied) is NOT called during execution.
- **Regression Testing**:
  - Run `npm test -w packages/renderer` to ensure existing tests pass.
