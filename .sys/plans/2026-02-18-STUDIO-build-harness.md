# 📋 STUDIO: Build Command - Player Harness

#### 1. Context & Goal
- **Objective**: Enhance the `helios build` command to automatically wrap the built composition in a "Player Harness" HTML file, ensuring the output is a deployable, playable video experience with controls.
- **Trigger**: The current `helios build` simply wraps `vite build`, producing a "headless" composition (`index.html` executing the animation) without any playback controls. This leaves users with a non-interactive deployment.
- **Impact**: Unlocks the "Preview with the Player" vision for production builds. Users can deploy the `dist/` folder to any static host (Netlify, Vercel, S3) and get a full player experience by default.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/build.ts` - Update the action handler to post-process the build output.
- **Create**: `tests/verify-build-harness.ts` - A standalone verification script to ensure the harness is generated correctly by mocking a project environment.
- **Read-Only**: `packages/player/package.json` - Reference for resolving the player bundle path.

#### 3. Implementation Spec
- **Architecture**:
  - The build process will run in a two-stage pipeline:
    1.  **Vite Build**: Execute the standard `vite build` (via existing logic) which compiles the user's composition to `[outDir]/index.html`.
    2.  **Harness Generation (Post-Build)**:
        -   Detect if `index.html` exists in the output directory.
        -   Rename `[outDir]/index.html` to `[outDir]/composition.html`.
        -   Resolve the `@helios-project/player` bundle from the project's `node_modules` (specifically looking for `dist/helios-player.bundle.mjs` or falling back to `dist/helios-player.global.js`).
        -   Copy the player bundle to `[outDir]/assets/helios-player.js`.
        -   Generate a new `[outDir]/index.html` that embeds `<helios-player>` pointing to `composition.html`.

- **Pseudo-Code (`packages/cli/src/commands/build.ts`)**:
  ```typescript
  import { rename, copyFile, writeFile, readFile, mkdir } from 'fs/promises';
  import { existsSync } from 'fs';
  import { join, resolve, dirname } from 'path';

  action(async (options) => {
    // 1. Run Vite Build
    await vite.build({ ... });

    // 2. Post-processing
    const outDir = resolve(process.cwd(), options.outDir || 'dist');
    const indexHtml = join(outDir, 'index.html');
    const compositionHtml = join(outDir, 'composition.html');
    const playerAssetPath = join(outDir, 'assets/helios-player.js');

    // Only proceed if index.html exists (standard build output)
    if (existsSync(indexHtml)) {
      console.log('Generating Player Harness...');

      // Rename composition
      await rename(indexHtml, compositionHtml);

      // Resolve Player Bundle
      // Attempt to find the bundle in node_modules
      let playerBundleSource: string | null = null;
      try {
        // Heuristic: Check common paths
        const playerPkg = resolve(process.cwd(), 'node_modules/@helios-project/player');
        const bundlePath = join(playerPkg, 'dist/helios-player.bundle.mjs');
        if (existsSync(bundlePath)) {
          playerBundleSource = bundlePath;
        } else {
           // Fallback to global if bundle missing
           const globalPath = join(playerPkg, 'dist/helios-player.global.js');
           if (existsSync(globalPath)) playerBundleSource = globalPath;
        }
      } catch (e) {
        // Ignore resolution errors
      }

      if (playerBundleSource) {
        // Copy Player
        // Ensure assets dir exists (Vite might have created it, but verify)
        await mkdir(dirname(playerAssetPath), { recursive: true });
        await copyFile(playerBundleSource, playerAssetPath);

        // Write Harness
        const harnessHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Helios Player</title>
            <style>
              body { margin: 0; background: #000; height: 100vh; width: 100vw; overflow: hidden; display: flex; align-items: center; justify-content: center; }
              helios-player { width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <helios-player src="composition.html" controls autoplay></helios-player>
            <script type="module" src="./assets/helios-player.js"></script>
          </body>
          </html>
        `;
        await writeFile(indexHtml, harnessHtml);
        console.log(chalk.green('✓ Player Harness generated at index.html'));
      } else {
        console.warn(chalk.yellow('! Player bundle not found. Skipping harness generation.'));
        // Revert rename if player not found to leave a working (headless) build
        await rename(compositionHtml, indexHtml);
      }
    }
  })
  ```

- **Dependencies**:
  - The feature relies on `@helios-project/player` being installed and built in the user's project (standard for Helios templates).
  - Uses standard Node.js `fs` and `path` modules.

#### 4. Test Plan
- **Verification**:
  - Run `npx tsx tests/verify-build-harness.ts`
  - The script will:
    1.  Create a temporary test directory `temp-build-test`.
    2.  Write a minimal `vite.config.ts` and `index.html` (mocking a project).
    3.  Create a mock `node_modules/@helios-project/player/dist/helios-player.bundle.mjs` file to simulate the installed dependency.
    4.  Execute `node packages/cli/bin/helios.js build --out-dir dist` within the temp directory.
    5.  Assert that `dist/composition.html` exists.
    6.  Assert that `dist/index.html` exists and contains the `<helios-player` tag.
    7.  Assert that `dist/assets/helios-player.js` exists and matches the mock content.
    8.  Cleanup the temp directory.
- **Success Criteria**:
  - The verification script passes, confirming the file renaming and generation logic works correctly.
- **Edge Cases**:
  - **Missing Player**: Verify that if the player bundle is missing, the build completes but leaves `index.html` as the composition (reverts rename).
  - **Custom OutDir**: Verify it respects the `--out-dir` flag.
