# CLI Build Command

## 1. Context & Goal
- **Objective**: Implement `helios build` command in the CLI to bundle user projects for web deployment, automatically wrapping them in a `<helios-player>` harness.
- **Trigger**: Vision Gap - "Preview with the Player" works in Studio, but `npm run build` (standard Vite) produces a headless app without playback controls, making it hard to share work.
- **Impact**: Enables one-step deployment of playable compositions to static hosts (Netlify, S3, Vercel), fulfilling the "Video is Light Over Time" vision on the web.

## 2. File Inventory
- **Create**: `packages/cli/src/commands/build.ts` (Implementation of the build command)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/cli/src/utils/config.ts` (To load user config if needed)

> **Note on Domain Ownership**: The Studio Architect Planner owns the CLI because it is the primary interface for the Studio and project lifecycle. While the code resides in `packages/cli`, this package is considered part of the Studio domain as documented in `docs/status/STUDIO.md` and previous journal entries. This plan modifies `packages/cli` to fulfill the Studio product vision.

## 3. Implementation Spec
- **Architecture**: The `build` command will use `vite.build()` programmatically. It will act as a "meta-bundler" that:
  1. Builds the user's project (using their existing `vite.config.ts` but overriding `outDir` to `dist/_project`).
  2. Generates a "wrapper" `index.html` in `dist/` that loads the `<helios-player>` web component from CDN (unpkg) and points it to the built project.
- **Pseudo-Code**:
  ```typescript
  export function registerBuildCommand(program) {
    program.command('build')
      .option('--out-dir <dir>', 'Output directory', 'dist')
      .option('--no-player', 'Skip player wrapper')
      .action(async (options) => {
         // 1. Run Vite Build
         await vite.build({
           root: process.cwd(),
           build: {
             outDir: path.join(options.outDir, '_project'),
             emptyOutDir: true
           }
         });
         // 2. If !noPlayer, write wrapper index.html
         if (!options.noPlayer) {
           const html = generatePlayerHtml('./_project/index.html'); // or finding actual entry
           fs.writeFileSync(path.join(options.outDir, 'index.html'), html);
         }
      })
  }
  ```
- **Public API Changes**: New CLI command `helios build`.
- **Dependencies**: None (uses existing `vite` dependency in CLI).

## 4. Test Plan
- **Verification**:
  1. `cd examples/waapi-animation`
  2. `npx tsx ../../packages/cli/src/index.ts build`
  3. Check `dist/index.html` contains `<helios-player>`.
  4. Check `dist/_project/assets` contains built JS/CSS.
- **Success Criteria**: The `dist` folder serves a working player with the composition when opened in a browser.
- **Edge Cases**:
  - User has no `vite.config.ts`.
  - User specifies a custom entry point.
