# 1. Context & Goal
- **Objective**: Enhance the `helios build` command to generate a deployment-ready "Player Harness" (index.html) that wraps the composition in the `<helios-player>` Web Component.
- **Trigger**: Currently, `helios build` simply runs `vite build`, which typically outputs a headless composition (e.g., `index.html` that renders the animation but has no controls). This leaves users without a playable artifact to deploy.
- **Impact**: Users can deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages) and get a full player experience with Play/Pause, Scrubbing, and Settings, fulfilling the "Build and sell products" vision.

# 2. File Inventory
- **Modify**: `packages/cli/src/commands/build.ts` (Implement post-build logic)
- **Read-Only**: `packages/cli/package.json` (Dependencies check)
- **Read-Only**: `packages/player/package.json` (To verify bundle exports)

# 3. Implementation Spec
- **Architecture**:
  - The CLI will wrap `vite.build`.
  - Post-build, it will inspect the output directory (default `dist`).
  - It will perform a "File Swap": `index.html` (Composition) -> `composition.html`.
  - It will generate a new `index.html` (Harness) containing `<helios-player>`.
  - It will resolve the `@helios-project/player` bundle from the user's `node_modules` and copy it to the output directory to ensure the player works without external CDNs.

- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/build.ts
  import fs from 'fs';
  import path from 'path';
  import { createRequire } from 'module';

  const require = createRequire(import.meta.url);

  action(async (options) => {
    // 1. Run Vite Build
    await vite.build({ ... });

    // 2. Check for Harness Flag (default true)
    if (options.harness === false) return;

    // 3. Locate Output
    const dist = path.resolve(process.cwd(), options.outDir || 'dist');
    const indexHtml = path.join(dist, 'index.html');

    if (!fs.existsSync(indexHtml)) {
       console.warn("No index.html found. Skipping player harness generation.");
       return;
    }

    // 4. Rename Composition
    const compHtml = path.join(dist, 'composition.html');
    fs.renameSync(indexHtml, compHtml);

    // 5. Resolve Player Bundle
    // We try to find the package.json of the player installed in the user's project
    let bundlePath;
    try {
        const playerPkgPath = require.resolve('@helios-project/player/package.json', { paths: [process.cwd()] });
        const playerPkg = JSON.parse(fs.readFileSync(playerPkgPath, 'utf-8'));
        const bundleRelative = playerPkg.exports?.['./bundle'] || 'dist/helios-player.bundle.mjs';
        bundlePath = path.resolve(path.dirname(playerPkgPath), bundleRelative);
    } catch (e) {
        console.warn("Could not resolve @helios-project/player. Skipping harness.");
        // Revert rename? Or just leave it as composition.html?
        // Better to revert if we fail.
        fs.renameSync(compHtml, indexHtml);
        return;
    }

    // 6. Copy Player Bundle
    const destBundle = path.join(dist, 'helios-player.js');
    fs.copyFileSync(bundlePath, destBundle);

    // 7. Write Harness index.html
    const harnessHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Helios Player</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body { margin: 0; background: #000; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }</style>
        <script type="module" src="./helios-player.js"></script>
      </head>
      <body>
        <helios-player src="./composition.html" style="width: 100%; height: 100%; max-width: 100%;"></helios-player>
      </body>
      </html>
    `;
    fs.writeFileSync(indexHtml, harnessHtml);
    console.log("Generated Player Harness at index.html");
  })
  ```

- **Public API Changes**:
  - `helios build` command now accepts `--no-harness` to disable this behavior.
  - Default behavior changes: `dist/index.html` is now the Player, `dist/composition.html` is the composition.

- **Dependencies**:
  - Requires `@helios-project/player` to be installed in the target project (standard for Helios projects).

# 4. Test Plan
- **Verification**:
  1. Create a temporary test project (or use an existing example).
  2. Run `npx helios build`.
  3. Verify `dist/index.html` contains `<helios-player>`.
  4. Verify `dist/composition.html` exists.
  5. Verify `dist/helios-player.js` exists.
  6. Serve `dist` and check if Player loads.
- **Success Criteria**: `dist/` is self-contained and playable.
- **Edge Cases**:
  - `dist` does not contain `index.html` (e.g. library build) -> Should skip gracefully.
  - `@helios-project/player` not found -> Should warn and skip.
