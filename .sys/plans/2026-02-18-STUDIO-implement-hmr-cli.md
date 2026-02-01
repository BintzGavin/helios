#### 1. Context & Goal
- **Objective**: Replace the static `vite preview` server in `npx helios studio` with a custom Vite Dev Server to enable Hot Module Replacement (HMR) for user compositions.
- **Trigger**: Vision Gap - The "Hot Reloading" feature promised in the README currently fails in the distributed CLI because it uses a static preview server.
- **Impact**: Enables a true "Browser-based development environment" where changes to the user's composition code define the "Studio Experience" with instant feedback.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/cli.ts` (The new CLI entry point implementing the custom Vite server)
  - `packages/studio/tsup.config.ts` (Build configuration for bundling the CLI)
- **Modify**:
  - `packages/studio/package.json` (Add `tsup` dependency, update build scripts, update bin entry)
  - `packages/studio/vite.config.ts` (Update build base to `/_studio/` for asset namespacing)
  - `packages/studio/bin/helios-studio.js` (Update to invoke the bundled CLI)
- **Read-Only**:
  - `packages/studio/vite-plugin-studio-api.ts` (Will be imported and bundled)

#### 3. Implementation Spec
- **Architecture**:
  - The Studio CLI will run a **Vite Dev Server** rooted at the **User's Project** (`HELIOS_PROJECT_ROOT` or CWD).
  - The Studio UI (frontend) will be pre-built (via `vite build`) into `packages/studio/dist/`.
  - A custom "Studio UI Plugin" will intercept requests to serving the Studio frontend:
    - `/_studio/*` -> Served statically from `dist/_studio/`.
    - `/` -> Served statically from `dist/index.html`.
  - All other requests (e.g., `/src/main.tsx`, `/assets/logo.png`) fall through to the Vite Dev Server, which serves the User's Project with full HMR support.
  - The Studio Server code (CLI + API Plugin) will be bundled using `tsup` to a single ESM file (`dist/cli.js`) to allow execution without `ts-node`.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/cli.ts
  import { createServer } from 'vite';
  import { studioApiPlugin } from './vite-plugin-studio-api';
  import path from 'path';

  const projectRoot = process.env.HELIOS_PROJECT_ROOT || process.cwd();
  const studioDist = path.resolve(__dirname, '../dist'); // Resolved relative to built cli.js

  const server = await createServer({
    root: projectRoot, // HMR User Files
    server: { port: 5173 },
    plugins: [
      studioApiPlugin(),
      {
        name: 'serve-studio-ui',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
             if (req.url.startsWith('/_studio/')) {
                // Serve static file from dist/_studio
                // ... implementation using 'sirv' or 'send' or stream pipe
                return;
             }
             if (req.url === '/') {
                // Serve dist/index.html
                return;
             }
             next();
          });
        }
      }
    ]
  });
  await server.listen();
  ```

- **Dependencies**:
  - Add `tsup` to `devDependencies` in `packages/studio`.

#### 4. Test Plan
- **Verification**:
  1. Build the Studio package: `npm run build -w packages/studio`.
  2. Create a temporary test project (or use an example) with a `composition.html` and a script file.
  3. Run the CLI in that project: `node packages/studio/bin/helios-studio.js`.
  4. Open the browser at `http://localhost:5173`.
- **Success Criteria**:
  1. The Studio UI loads (verifying static serving works).
  2. The Composition loads in the iframe.
  3. Modify the composition script in the test project.
  4. Verify the change is reflected in the Studio (iframe) *without* a manual refresh (verifying HMR).
- **Edge Cases**:
  - User project has a file named `index.html` (should be overridden by Studio UI at `/`? Or Studio UI should be at `/` and User index at `/composition.html`? Current architecture uses `/` for Studio).
  - Port 5173 is in use (Vite should auto-increment).
