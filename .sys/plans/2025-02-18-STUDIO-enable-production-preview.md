# 2025-02-18-STUDIO-enable-production-preview.md

#### 1. Context & Goal
- **Objective**: Enable `npm run preview` to function correctly by updating `vite-plugin-studio-api` to support the preview server and manually serve project files via a `/@fs/` middleware.
- **Trigger**: The current Studio implementation relies entirely on `vite dev` (which handles `/@fs/` magic automatically). To ship Studio as a standalone tool (`npx helios studio`), it must run from a production build (`dist/`) where Vite's dev server magic is absent.
- **Impact**: Unlocks the ability to distribute Helios Studio as a package. Validates that the backend API works in a production-like environment.

#### 2. File Inventory
- **Modify**: `packages/studio/vite-plugin-studio-api.ts`
  - Add `configurePreviewServer` hook.
  - Implement `serveProjectFiles` middleware for `/@fs/` routes.
- **Modify**: `packages/studio/scripts/verify-ui.ts`
  - Support `PORT` environment variable (override default 5173).
  - Support `SKIP_SPAWN` environment variable (to test against an external/preview server).

#### 3. Implementation Spec
- **Architecture**:
  - The `studioApiPlugin` will share its middleware logic between `configureServer` (Dev) and `configurePreviewServer` (Preview).
  - A new middleware function will intercept `GET /@fs/*` requests.
  - This middleware allows the Preview server to serve files from the user's disk (e.g. `composition.html`, assets), mimicking Vite's Dev server behavior.

- **Pseudo-Code (vite-plugin-studio-api.ts)**:
  ```typescript
  // Extract middleware setup to a shared function
  function configureMiddlewares(server) {
      // ... existing API middlewares ...

      // NEW: Middleware for /@fs/ (Project File Serving)
      server.middlewares.use('/@fs', (req, res, next) => {
          // 1. Extract path from url (req.url is relative to mount point /@fs)
          //    e.g. req.url = "/Users/me/project/file.png"

          // 2. Decode URI component

          // 3. Handle Windows paths if necessary (remove leading slash if it precedes a drive letter)
          //    e.g. "/C:/Windows" -> "C:/Windows"

          // 4. Validate file existence

          // 5. Check security (optional but good practice: ensure within HELIOS_PROJECT_ROOT or allowed paths)
          //    For now, mimic Vite Dev behavior which is permissible for local tools.

          // 6. Serve file using 'fs.createReadStream(path).pipe(res)'
          //    Set appropriate Content-Type based on extension (mime-types or simple lookup)
      });
  }

  export function studioApiPlugin(): Plugin {
    return {
      name: 'helios-studio-api',
      configureServer: configureMiddlewares,
      configurePreviewServer: configureMiddlewares // Hook for 'vite preview'
    };
  }
  ```

- **Pseudo-Code (verify-ui.ts)**:
  ```typescript
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5173;
  const SKIP_SPAWN = process.env.SKIP_SPAWN === 'true';

  async function verifyStudio() {
    let server;

    if (!SKIP_SPAWN) {
       // ... spawn logic ...
       // Ensure PORT env var is passed to spawned process
    } else {
       console.log('Skipping server spawn, waiting for URL...');
    }

    // ... existing verification logic ...

    // Cleanup: Only kill server if we spawned it
    if (server) process.kill(-server.pid);
  }
  ```

#### 4. Test Plan
- **Verification**:
  1. Build the studio: `npm run build` (in `packages/studio`)
  2. Start preview server in background: `npm run preview -- --port 4173 & PID=$!`
  3. Run verification against preview: `sleep 5; PORT=4173 SKIP_SPAWN=true npx tsx scripts/verify-ui.ts`
  4. Cleanup: `kill $PID`
- **Success Criteria**: The verification script completes successfully (Timeline found, Renders panel verified, etc.) while running against the *preview* build.
- **Edge Cases**:
  - Verify that assets (images) inside the composition load correctly (via `/@fs/`).
