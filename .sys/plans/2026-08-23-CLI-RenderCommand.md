# Plan: Implement `helios render` Command

## 1. Context & Goal
- **Objective**: Implement the `helios render` command in the CLI to enable local rendering of compositions.
- **Trigger**: Vision gap in `AGENTS.md` ("Helios must support distributed rendering... Local only rendering is insufficient"). This is the foundational CLI entry point for both local and future distributed rendering.
- **Impact**: Unlocks the ability to render videos directly from the command line, a prerequisite for CI/CD integration and distributed rendering workflows.

## 2. File Inventory
- **Modify**:
    - `packages/cli/package.json`: Add `@helios-project/renderer` dependency and bump version to `0.4.1`.
    - `packages/cli/src/index.ts`: Register the new render command and update version.
    - `docs/status/CLI.md`: Update status to reflect `helios render` implementation and version `0.4.1`.
- **Create**:
    - `packages/cli/src/commands/render.ts`: Implementation of the render command.
- **Read-Only**:
    - `packages/renderer/src/Renderer.ts`: To understand the API and options.
    - `packages/renderer/src/types.ts`: To map CLI flags to `RendererOptions`.

## 3. Implementation Spec
- **Architecture**:
    - The `render` command will use the `commander` library to define flags matching `RendererOptions`.
    - It will import `Renderer` from `@helios-project/renderer`.
    - It will instantiate `Renderer` with the provided options and call `.render(input, output)`.
- **CLI Interface**:
    ```bash
    helios render <input> [options]
    ```
    - `<input>`: URL or file path to the composition.
    - `-o, --output <path>`: Output file path (default: `output.mp4`).
    - `--width <number>`: Viewport width (default: 1920).
    - `--height <number>`: Viewport height (default: 1080).
    - `--fps <number>`: Frames per second (default: 30).
    - `--duration <number>`: Duration in seconds (default: 1).
    - `--quality <number>`: CRF quality (0-51, lower is better).
- **Pseudo-Code (`src/commands/render.ts`)**:
    ```typescript
    import { Command } from 'commander';
    import path from 'path';
    import { Renderer } from '@helios-project/renderer';

    export function registerRenderCommand(program: Command) {
      program
        .command('render <input>')
        .description('Render a composition to video')
        .option('-o, --output <path>', 'Output file path', 'output.mp4')
        .option('--width <number>', 'Viewport width', '1920')
        .option('--height <number>', 'Viewport height', '1080')
        .option('--fps <number>', 'Frames per second', '30')
        .option('--duration <number>', 'Duration in seconds', '1')
        .option('--quality <number>', 'CRF quality (0-51)', undefined)
        .action(async (input, options) => {
            // Resolve input to URL if it's a file path
            // If input doesn't start with http/https, assume file path and resolve to absolute file:// URL
            const url = input.startsWith('http') ? input : `file://${path.resolve(process.cwd(), input)}`;

            const renderer = new Renderer({
                width: parseInt(options.width),
                height: parseInt(options.height),
                fps: parseInt(options.fps),
                durationInSeconds: parseInt(options.duration),
                crf: options.quality ? parseInt(options.quality) : undefined,
                // ... map other options as needed
            });

            try {
                await renderer.render(url, path.resolve(process.cwd(), options.output));
            } catch (err) {
                console.error('Render failed:', err);
                process.exit(1);
            }
        });
    }
    ```
- **Dependencies**:
    - Requires `@helios-project/renderer` to be built and available in the workspace.

## 4. Test Plan
- **Verification**:
    1.  Rebuild `packages/cli`: `npm run build -w packages/cli`.
    2.  Run `node packages/cli/bin/helios.js render <path/to/composition.html> --output test_render.mp4`.
    3.  Verify `test_render.mp4` exists and is a valid video file.
- **Success Criteria**:
    - The command runs without errors.
    - The output video is generated.
- **Edge Cases**:
    - Invalid input URL/path.
    - Missing output permission.
