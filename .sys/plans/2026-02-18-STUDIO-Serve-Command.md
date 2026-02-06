# Context & Goal
- **Objective**: Implement the `helios serve` CLI command.
- **Trigger**: Vision gap in "Containerized Rendering". The README describes a microservice architecture, but no command exists to run the renderer as a persistent HTTP service suitable for Docker/Cloud Run.
- **Impact**: Unlocks distributed rendering workflows and cloud deployments.

# File Inventory
- **Create**:
  - `packages/cli/src/commands/serve.ts`: Implementation of the command.
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new command.
- **Read-Only**:
  - `packages/cli/src/commands/studio.ts`: Reference for plugin usage.
  - `packages/studio/package.json`: Reference for exports.

# Implementation Spec
- **Architecture**:
  - Use `vite.preview()` to create a production server.
  - Inject `@helios-project/studio/cli`'s `studioApiPlugin` into the preview server to provide the `/api/render` endpoint.
  - This effectively runs the Studio Backend in "Headless/Production" mode, serving the built composition assets (`dist/`) and exposing the control API.
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/serve.ts
  import { preview } from 'vite';
  import { studioApiPlugin } from '@helios-project/studio/cli';

  export function registerServeCommand(program) {
    program.command('serve [dir]')
       .option('-p, --port <number>', '8080')
       .option('-o, --out-dir <dir>', 'dist')
       .action(async (dir, options) => {
          // Resolve paths
          // Start Vite Preview with studioApiPlugin
          const server = await preview({
             build: { outDir: options.outDir },
             preview: { port: options.port, host: true },
             plugins: [studioApiPlugin({ ... })]
          });
          server.printUrls();
       });
  }
  ```
- **Public API Changes**: New `helios serve` command.
- **Dependencies**: `@helios-project/studio`, `vite`.

# Test Plan
- **Verification**:
  1. Build CLI: `npm run build` in `packages/cli`.
  2. Build Example: `helios build` in `examples/simple-canvas-animation`.
  3. Run Server: `helios serve --port 8081`.
  4. Test API: `curl -X POST http://localhost:8081/api/render -d '{"compositionUrl": "/composition.html", ...}'`.
- **Success Criteria**: The server starts, and the curl request triggers a render job that completes (or fails with expected environment error like missing browser).
- **Edge Cases**: Port in use, missing `dist` directory.
