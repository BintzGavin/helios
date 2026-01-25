# Plan: Implement Studio Backend API & Project Discovery

## 1. Context & Goal
- **Objective**: Replace the hardcoded mock compositions in Helios Studio with a real file-system discovery mechanism using a custom Vite plugin.
- **Trigger**: The current Studio displays static mock data and cannot see the actual example projects in the repository (`examples/` directory), creating a disconnect between the tool and the user's code.
- **Impact**: This enables the Studio to dynamically list and load compositions. It establishes the architectural pattern (Vite Plugin as Backend) needed for future "User Project" discovery and "Assets Panel" implementation.

## 2. File Inventory
- **Create**:
    - `packages/studio/vite-plugin-studio-api.ts`: A Vite plugin that adds the `/api/compositions` endpoint.
    - `packages/studio/src/server/discovery.ts`: Node.js utility to scan the `examples/` directory for `composition.html` files.
- **Modify**:
    - `packages/studio/vite.config.ts`: Register the new plugin and configure `server.fs.allow` to permit serving files from the repository root (needed to load examples).
    - `packages/studio/src/context/StudioContext.tsx`: Remove `MOCK_COMPOSITIONS` and implement `fetch('/api/compositions')` logic.
- **Read-Only**:
    - `examples/`: The directory to be scanned.

## 3. Implementation Spec
- **Architecture**:
    - **Backend (Node.js/Vite)**: A custom Vite plugin intercepts requests to `/api/*`. It uses `fs` and `path` to scan the file system and returns JSON.
    - **Frontend (React)**: The `StudioContext` fetches this JSON on mount and hydrates the state.

- **Pseudo-Code (Discovery - `src/server/discovery.ts`)**:
    ```typescript
    import fs from 'fs';
    import path from 'path';

    export interface CompositionInfo {
      id: string;
      name: string;
      url: string;
    }

    export function findCompositions(rootDir: string): CompositionInfo[] {
       const examplesDir = path.resolve(rootDir, '../../examples'); // Relative to packages/studio

       if (!fs.existsSync(examplesDir)) return [];

       const entries = fs.readdirSync(examplesDir, { withFileTypes: true });
       const compositions: CompositionInfo[] = [];

       for (const entry of entries) {
           if (entry.isDirectory()) {
               const compPath = path.join(examplesDir, entry.name, 'composition.html');
               if (fs.existsSync(compPath)) {
                   // Format name: "simple-canvas-animation" -> "Simple Canvas Animation"
                   const name = entry.name
                       .split('-')
                       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                       .join(' ');

                   compositions.push({
                       id: entry.name,
                       name: name,
                       // URL relative to server root.
                       // Since we will allow serving root, URL should be /examples/...
                       url: `/examples/${entry.name}/composition.html`
                   });
               }
           }
       }
       return compositions;
    }
    ```

- **Pseudo-Code (Vite Plugin - `vite-plugin-studio-api.ts`)**:
    ```typescript
    import { Plugin } from 'vite';
    import { findCompositions } from './src/server/discovery';

    export function studioApiPlugin(): Plugin {
      return {
        name: 'helios-studio-api',
        configureServer(server) {
          server.middlewares.use('/api/compositions', async (req, res, next) => {
             // Basic routing
             if (req.url === '/' || req.url === '') { // exact match depending on mount
                 try {
                     const comps = findCompositions(process.cwd());
                     res.setHeader('Content-Type', 'application/json');
                     res.end(JSON.stringify(comps));
                 } catch (e) {
                     console.error(e);
                     res.statusCode = 500;
                     res.end(JSON.stringify({ error: 'Failed to scan compositions' }));
                 }
                 return;
             }
             next();
          });
        }
      }
    }
    ```

- **Pseudo-Code (Vite Config - `vite.config.ts`)**:
    ```typescript
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';
    import { studioApiPlugin } from './vite-plugin-studio-api';
    import path from 'path';

    export default defineConfig({
      plugins: [react(), studioApiPlugin()],
      server: {
        fs: {
            // Allow serving files from one level up to the project root
            allow: [path.resolve(__dirname, '../../')]
        }
      }
    });
    ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1. Run `cd packages/studio && npm run dev` (I cannot run this myself, but the execution agent will).
    2. Check that the Studio UI loads without errors.
    3. Open the "Composition Switcher" and verify it lists the actual folders from `examples/`.
    4. Click "Simple Canvas Animation" and ensure the player loads the content.
- **Success Criteria**:
    - `/api/compositions` returns a valid JSON list of examples.
    - The UI displays these items.
    - `MOCK_COMPOSITIONS` is removed from `StudioContext.tsx`.
