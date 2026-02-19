# CLI Plan: `helios deploy` Command

## 1. Context & Goal
- **Objective**: Implement a `helios deploy` command to scaffold Docker configuration for distributed rendering and enable cloud deployment workflows.
- **Trigger**: The "Cloud execution adapter" and "Distributed Rendering" gaps in `docs/BACKLOG.md` and `AGENTS.md`. Currently, users have no easy way to package Helios projects for cloud execution (e.g., AWS Batch, Lambda).
- **Impact**: Unlocks the "Distributed Video Platform" vision by providing a standardized container environment. Updates `helios render` to support critical browser arguments (like `--no-sandbox`) required for containerized environments.

## 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/deploy.ts`: Implementation of the `deploy` command and its `setup` subcommand.
  - `packages/cli/src/templates/docker.ts`: Templates for `Dockerfile` and `docker-compose.yml`.
- **Modify**:
  - `packages/cli/src/commands/render.ts`: Update to read `HELIOS_BROWSER_ARGS` environment variable.
  - `packages/cli/src/index.ts`: Register the new `deploy` command.
- **Read-Only**:
  - `packages/cli/src/commands/job.ts`: For reference on job execution.

## 3. Implementation Spec

### Architecture
- **Command Structure**: `helios deploy setup` (scaffolds Docker files).
- **Environment Support**: Update `helios render` to inject `process.env.HELIOS_BROWSER_ARGS` into `RenderOrchestrator`'s `browserConfig.args`. This is essential because standard Docker usage of Puppeteer requires `--no-sandbox`.

### Logic Flow (`deploy setup`)
1. User runs `helios deploy setup`.
2. Check if `Dockerfile` already exists.
   - If yes, prompt to overwrite (or skip).
3. Check if `docker-compose.yml` exists.
   - If yes, prompt to overwrite.
4. Write `Dockerfile` using `node:18` base, installing `ffmpeg` and `chromium`, and setting `ENV HELIOS_BROWSER_ARGS="--no-sandbox --disable-setuid-sandbox"`.
5. Write `docker-compose.yml` for local testing.
6. Print instructions on how to build and run.

### Pseudo-Code (`render.ts`)
```typescript
const browserArgs = process.env.HELIOS_BROWSER_ARGS
  ? process.env.HELIOS_BROWSER_ARGS.split(' ')
  : [];

const renderOptions = {
  // ...
  browserConfig: {
    headless: options.headless,
    args: browserArgs
  }
};
```

### Public API Changes
- New CLI Command: `helios deploy setup`
- New Environment Variable: `HELIOS_BROWSER_ARGS` supported by `helios render`.

### Dependencies
- No external dependencies.

## 4. Test Plan
- **Verification**:
  1. Create a test directory and initialize a basic project (`helios init`).
  2. Run `helios deploy setup`.
  3. Verify `Dockerfile` exists and contains `ENV HELIOS_BROWSER_ARGS`.
  4. Verify `docker-compose.yml` exists.
  5. Set `HELIOS_BROWSER_ARGS="--custom-test-flag"` and run `helios render` (mocked or real).
  6. Verify the flag is passed to the browser launch arguments (e.g. by checking logs or mocking `RenderOrchestrator`).
- **Success Criteria**:
  - `helios deploy setup` successfully creates the Docker configuration files.
  - `helios render` respects the `HELIOS_BROWSER_ARGS` environment variable.
