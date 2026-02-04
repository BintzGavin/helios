# Plan: Implement `helios render` Command

## 1. Context & Goal
- **Objective**: Implement the `helios render` command in the CLI to enable users to render compositions to video files.
- **Trigger**: "Render Commands" item in V2 Roadmap (AGENTS.md) and "Backlog" (docs/status/CLI.md).
- **Impact**: Unlocks local rendering capability directly from the CLI, bridging the gap between the `renderer` package and user workflows. This is a critical step for V2 platform goals.

## 2. File Inventory
- **Create**: `packages/cli/src/commands/render.ts` (New command implementation)
- **Modify**: `packages/cli/package.json` (Add `@helios-project/renderer` dependency)
- **Modify**: `packages/cli/src/index.ts` (Register the new command)
- **Read-Only**: `packages/renderer/src/Renderer.ts` (To understand API), `packages/cli/src/utils/config.ts`

## 3. Implementation Spec

### Architecture
- **Dependency Management**: The CLI will add a direct dependency on `@helios-project/renderer`. Since both are in the same monorepo, use `workspace:*` for the version to ensure they stay in sync.
- **Command Structure**: Use Commander.js to define a new `render` subcommand.
- **Renderer Integration**: The command will instantiate the `Renderer` class from the renderer package and invoke its `render` method.

### Dependencies
- **New Dependency**: `@helios-project/renderer` (version `workspace:*`)
- **Existing Dependencies**: `commander`, `chalk`, `path`, `fs` (Node.js built-ins)

### Pseudo-Code (`packages/cli/src/commands/render.ts`)

```typescript
// Import dependencies
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { Renderer } from '@helios-project/renderer';

export function registerRenderCommand(program: Command) {
  program
    .command('render <input> [output]')
    .description('Render a composition to a video file')
    .option('-w, --width <number>', 'Video width', '1920')
    .option('-h, --height <number>', 'Video height', '1080')
    .option('-f, --fps <number>', 'Frames per second', '30')
    .option('-d, --duration <number>', 'Duration in seconds', '5')
    .action(async (input, output, options) => {
      try {
        // 1. Resolve Input Path
        const cwd = process.cwd();
        const inputPath = path.resolve(cwd, input);

        if (!fs.existsSync(inputPath)) {
          console.error(chalk.red(`Input file not found: ${inputPath}`));
          process.exit(1);
        }

        // Convert file path to file:// URL for the renderer
        const compositionUrl = `file://${inputPath}`;

        // 2. Resolve Output Path
        // If output is not provided, default to 'output.mp4' in cwd
        const outputPath = output
          ? path.resolve(cwd, output)
          : path.resolve(cwd, 'output.mp4');

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // 3. Parse Options
        const width = parseInt(options.width, 10);
        const height = parseInt(options.height, 10);
        const fps = parseInt(options.fps, 10);
        const duration = parseFloat(options.duration);

        if (isNaN(width) || isNaN(height) || isNaN(fps) || isNaN(duration)) {
             console.error(chalk.red('Invalid numeric options provided.'));
             process.exit(1);
        }

        // 4. Instantiate Renderer
        console.log(chalk.cyan(`Starting render...`));
        console.log(`Input: ${compositionUrl}`);
        console.log(`Output: ${outputPath}`);
        console.log(`Config: ${width}x${height} @ ${fps}fps, ${duration}s`);

        const renderer = new Renderer({
          width,
          height,
          fps,
          durationInSeconds: duration,
          // Default to 'dom' or 'canvas' mode?
          // Renderer defaults to canvas if mode is not specified in options,
          // but let's leave it to Renderer's default behavior or add a --mode option later.
        });

        // 5. Execute Render
        await renderer.render(compositionUrl, outputPath);

        console.log(chalk.green(`✓ Render complete: ${outputPath}`));

      } catch (error) {
        console.error(chalk.red('Render failed:'));
        console.error(error);
        process.exit(1);
      }
    });
}
```

### Public API Changes
- **CLI Command**: New `helios render` command exposed to users.
- **Package.json**: `packages/cli` now depends on `@helios-project/renderer`.

## 4. Test Plan

### Verification Steps
1.  **Install Dependencies**: Run `npm install` in the project root to link the new dependency.
2.  **Build CLI**: Run `npm run build -w packages/cli`.
3.  **Prepare Test Fixture**: Use an existing example, e.g., `examples/simple-canvas-animation/composition.html`.
4.  **Run Render**:
    ```bash
    node packages/cli/bin/helios.js render examples/simple-canvas-animation/composition.html test_render.mp4 --duration 1
    ```
5.  **Check Output**:
    -   Verify `test_render.mp4` exists.
    -   (Optional) Open the file to verify content if possible, or check file size > 0.

### Success Criteria
- The command runs without throwing generic Node.js errors.
- The renderer initializes and logs its progress.
- A video file is produced at the specified location.

### Edge Cases
- **Missing Input**: `helios render non_existent.html` -> Should log error and exit.
- **Invalid Numbers**: `helios render in.html out.mp4 --width abc` -> Should log error and exit.
- **Missing Browser**: If Playwright browsers are not installed, the Renderer will throw. The CLI should catch this and log the error (implementation handles generic error catching).
