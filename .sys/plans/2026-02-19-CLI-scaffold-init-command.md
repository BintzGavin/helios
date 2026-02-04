# 2026-02-19-CLI-scaffold-init-command.md

#### 1. Context & Goal
- **Objective**: Enhance `helios init` to scaffold a full project structure (React + Vite + Helios).
- **Trigger**: Vision gap - `helios init` currently only creates a config file, failing the "scaffold new Helios projects" vision defined in `AGENTS.md`.
- **Impact**: Users can instantly create a runnable Helios project, improving onboarding and V2 adoption.

#### 2. File Inventory
- **Create**: `packages/cli/src/utils/templates.ts`
- **Modify**: `packages/cli/src/commands/init.ts`
- **Read-Only**: `package.json` (root)

#### 3. Implementation Spec
- **Templates (`packages/cli/src/utils/templates.ts`)**:
  - Export string constants for the following files:
  - `PACKAGE_JSON`:
    ```json
    {
      "name": "helios-project",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "helios studio",
        "build": "tsc && vite build",
        "render": "helios render composition.html"
      },
      "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "@helios-project/core": "latest",
        "@helios-project/studio": "latest"
      },
      "devDependencies": {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.0.0",
        "typescript": "^5.0.0",
        "vite": "^7.0.0"
      }
    }
    ```
  - `VITE_CONFIG`:
    ```typescript
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'

    export default defineConfig({
      plugins: [react()],
    })
    ```
  - `TSCONFIG`:
    ```json
    {
      "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true
      },
      "include": ["src"]
    }
    ```
  - `INDEX_HTML`:
    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Helios Project</title>
        <style>body { margin: 0; overflow: hidden; background: black; }</style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
      </body>
    </html>
    ```
  - `MAIN_TSX`:
    ```typescript
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { Helios } from '@helios-project/core';
    import { Composition } from './composition';

    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

    const helios = new Helios({
      width: 1920,
      height: 1080,
      fps: 30
    });

    (window as any).helios = helios;

    root.render(
      <React.StrictMode>
        <Composition />
      </React.StrictMode>
    );
    ```
  - `COMPOSITION_TSX`:
    ```typescript
    import React from 'react';

    export const Composition = () => {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'black',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px'
        }}>
          <h1>Hello Helios</h1>
        </div>
      );
    };
    ```
  - `GITIGNORE`: Standard Node/Vite ignore list (`node_modules`, `dist`, `.env`, `.DS_Store`).

- **Logic (`packages/cli/src/commands/init.ts`)**:
  - Import templates from `../utils/templates`.
  - In the `action` handler:
    - Check if `package.json` exists in `process.cwd()`.
    - Use `readline` to ask: "Do you want to scaffold a new project? (y/N)" (Default to N if package.json exists, otherwise Y).
    - If user confirms:
      - Ensure `src` directory exists.
      - Write `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore` to root.
      - Write `src/main.tsx`, `src/composition.tsx` to `src/`.
      - Log success messages for created files.
    - Proceed to existing logic for `helios.config.json` creation (interactive prompts).
    - If scaffold occurred, log a final message: "Project initialized. Run 'npm install' to install dependencies."

- **Public API Changes**: `helios init` becomes interactive and capable of file generation.
- **Dependencies**: No new runtime dependencies for CLI. The scaffolded project will have standard dependencies.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli`.
  - Create a temporary directory `temp_scaffold_test`.
  - Run `node ../packages/cli/bin/helios.js init` inside `temp_scaffold_test`.
  - Confirm the prompt appears.
  - Answer "y".
  - Verify that `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/composition.tsx` are created.
  - Check the content of `package.json` to ensure scripts and dependencies are present.
  - Check that `helios.config.json` is also created.
  - Run `node ../packages/cli/bin/helios.js init` in a directory that already has `package.json`.
  - Verify that it warns or defaults to "No" for scaffolding.
- **Success Criteria**: All scaffolded files are present and contain valid code/JSON.
- **Edge Cases**:
  - Permission errors when writing files.
  - User aborts (Ctrl+C).
  - Existing files (logic should ideally overwrite if user said YES to scaffold, but strictly speaking we might want to warn. For this iteration, overwrite on YES is acceptable as it's an init command).
- **Pre-Commit Step**: Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
