# 2026-03-03-STUDIO-CLI-Build.md

#### 1. Context & Goal
- **Objective**: Implement `helios build` CLI command to generate a deployable web player artifact.
- **Trigger**: Missing functionality to build a self-contained player version of the composition (`npm run build` only builds the headless part, leaving users without a deployable UI).
- **Impact**: Enables users to deploy their Helios projects to static hosting providers (Vercel, Netlify, S3) with a functional player UI.

#### 2. File Inventory
- **Create**: `packages/cli/src/commands/build.ts` (New command logic)
- **Modify**: `packages/cli/src/index.ts` (Register command)
- **Read-Only**: `packages/cli/package.json` (Check dependencies)

#### 3. Implementation Spec
- **Architecture**:
  - The command wraps Vite's programmatic `build` API.
  - It generates a temporary entry point (`.helios-build-entry.html`) in the project root that imports `@helios-project/player` and renders `<helios-player>`.
  - It configures Vite to build both the user's `composition.html` and the new player harness using `rollupOptions.input`.
  - It handles post-build cleanup and ensures the output file is named `index.html`.
- **Pseudo-Code**:
  ```typescript
  import { build } from 'vite';
  // ... imports

  export function registerBuildCommand(program: Command) {
    program.command('build [dir]')
      .description('Build the project for web deployment')
      .option('-o, --output <path>', 'Output directory', 'dist')
      .action(async (dir = '.', options) => {
        // 1. Resolve paths (input dir, composition.html)
        // 2. Create temporary entry file `.helios-build-entry.html` in input dir.
        //    Content:
        //    <!DOCTYPE html>
        //    ...
        //    <helios-player src="./composition.html" auto-play></helios-player>
        //    <script type="module">import '@helios-project/player'</script>

        // 3. Invoke vite.build({
        //      root: dir,
        //      configFile: undefined, // Automatic resolution
        //      build: {
        //        outDir: options.output,
        //        emptyOutDir: true,
        //        rollupOptions: {
        //          input: {
        //             main: '.helios-build-entry.html',
        //             composition: 'composition.html'
        //          }
        //        }
        //      }
        //    })

        // 4. Cleanup: Delete `.helios-build-entry.html`

        // 5. Post-process: Rename `dist/.helios-build-entry.html` to `dist/index.html`
        //    (Vite keeps original name for HTML entries usually)

        console.log('Build complete.');
      });
  }
  ```
- **Public API Changes**: Adds `helios build` command to the CLI.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build -w packages/cli` to build the CLI.
  - Run `packages/cli/bin/helios.js build` in `examples/vanilla-js`.
  - Verify `dist/index.html` exists and contains the player tag.
  - Verify `dist/composition.html` exists.
  - Run `npx serve dist` and manually verify playback in browser.
- **Success Criteria**: `dist/` directory contains a working static site with `index.html` (Player) and `composition.html` (Content).
- **Edge Cases**:
  - `composition.html` missing.
  - User has existing `vite.config.ts`.
