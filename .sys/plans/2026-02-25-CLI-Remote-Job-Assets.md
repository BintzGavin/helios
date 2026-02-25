# CLI: Remote Job Asset Support

#### 1. Context & Goal
- **Objective**: Implement a `--base-url` option for `helios render --emit-job` to generate distributed job specifications that reference remote assets instead of local file paths.
- **Trigger**: The V2 Vision ("Stateless Rendering") requires generic workers that can fetch jobs and assets dynamically. Currently, `helios render --emit-job` generates relative local paths (e.g., `../dist/index.html`), which forces workers to have the project files pre-baked or mounted.
- **Impact**: Enables a "Pull" based distributed rendering workflow (compatible with AWS Lambda/stateless containers) where users upload assets to a static host (S3/GCS) and workers fetch them via HTTP, eliminating the need for custom container builds or complex volume mounts.

#### 2. File Inventory
- **Create**: None.
- **Modify**: `packages/cli/src/commands/render.ts` (Add `--base-url` option and update `relativeInput` logic).
- **Read-Only**: `packages/cli/src/types/job.ts` (Verify JobSpec structure).

#### 3. Implementation Spec
- **Architecture**:
  - Extend `helios render` CLI command with `--base-url <url>`.
  - When `--emit-job` is active and `--base-url` is provided:
    - Resolve the input file path relative to `process.cwd()`.
    - Construct the `relativeInput` URL by appending the relative path to the `base-url`.
    - Ensure the resulting `command` string in the generated JSON uses this absolute HTTP URL.
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/render.ts

  // ... in action(input, options) ...

  if (options.emitJob) {
     // ... existing setup ...

     let inputUrl = url;

     // If base-url is provided and input is a file
     if (options.baseUrl && url.startsWith('file://')) {
         const inputPath = fileURLToPath(url);
         // Ensure we calculate path relative to current working directory, not jobDir (unless they differ?)
         // Ideally relative to the project root or current directory.
         const relativePath = path.relative(process.cwd(), inputPath);

         // specific join logic for URL:
         // Remove trailing slash from baseUrl
         const cleanBase = options.baseUrl.replace(/\/$/, '');
         // Remove leading slash from relativePath
         const cleanPath = relativePath.replace(/^\//, '');

         inputUrl = `${cleanBase}/${cleanPath}`;
     } else if (url.startsWith('file://')) {
         // ... existing relative path logic ...
         const inputPath = fileURLToPath(url);
         inputUrl = path.relative(jobDir, inputPath);
     }

     // Use inputUrl in the command string generation
     const chunks = plan.chunks.map(chunk => ({
         // ...
         command: `helios render ${inputUrl} ...`
     }));
  }
  ```
- **Public API Changes**: New CLI flag `--base-url` for `helios render`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Create a dummy file `test-render.html`.
  2. Run `helios render test-render.html --emit-job job.json --base-url https://assets.example.com/builds/v1`.
  3. Read `job.json` and verify `chunks[0].command` contains `helios render https://assets.example.com/builds/v1/test-render.html`.
  4. Run `helios render test-render.html --emit-job job-local.json` (without flag) and verify it still produces relative paths.
- **Success Criteria**: Generated job spec contains correct remote URLs when flag is used, and preserves existing behavior when not.
- **Edge Cases**:
  - `base-url` with/without trailing slash.
  - Input file in subdirectory (`src/test.html`).
  - Input is already a URL (should ignore `--base-url` or warn).
