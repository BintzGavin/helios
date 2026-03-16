#### 1. Context & Goal
- **Objective**: Implement `helios deploy fly` command to scaffold Fly.io Machines deployment configuration for distributed rendering workers.
- **Trigger**: Gap between `packages/infrastructure/src/adapters/fly-machines-adapter.ts` (which exists) and `packages/cli/src/commands/deploy.ts` (which lacks Fly.io scaffolding).
- **Impact**: Unlocks fast, pay-per-frame VM deployments with GPU support on Fly.io, completing the deployment support for existing adapters.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/fly.ts` (Fly.io specific templates for `fly.toml`, `Dockerfile`, and `README-FLY.md`)
- **Modify**:
  - `packages/cli/src/commands/deploy.ts` (Add `fly` subcommand)
- **Read-Only**:
  - `packages/infrastructure/src/adapters/fly-machines-adapter.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Create a new file `packages/cli/src/templates/fly.ts` containing string templates.
  - Templates should include `FLY_TOML_TEMPLATE`, `FLY_DOCKERFILE_TEMPLATE`, and `README_FLY_TEMPLATE`.
  - In `packages/cli/src/commands/deploy.ts`, register `deploy.command('fly')`.
  - Prompt users to confirm before overwriting files if they already exist, similar to AWS/GCP templates.
  - Write out the required scaffolding files to `process.cwd()`.
- **Pseudo-Code**:
  - `const deploy = program.command('deploy')`
  - `deploy.command('fly').action(async () => { ... } )`
  - `if (fs.existsSync('fly.toml')) prompt overwrite`
  - `fs.writeFileSync('fly.toml', FLY_TOML_TEMPLATE)`
- **Public API Changes**:
  - Adds `helios deploy fly` command.
- **Dependencies**:
  - Relies on `@helios-project/infrastructure` for actual rendering execution.

#### 4. Test Plan
- **Verification**: Run `node packages/cli/bin/helios.js deploy fly` in a temporary directory and verify that `fly.toml`, `Dockerfile`, and `README-FLY.md` are created.
- **Success Criteria**: CLI command runs without errors and files match expected templates.
- **Edge Cases**: Prompts should correctly prevent overwriting existing files if the user declines.