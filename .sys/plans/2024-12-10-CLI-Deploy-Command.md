#### 1. Context & Goal
- **Objective**: Implement the `helios deploy` command to support cloud deployment workflows.
- **Trigger**: The prompt explicitely lists 'Deployment Commands - Future: commands for cloud deployment workflows' as a planned feature in AGENTS.md, but the prompt states the current reality only contains the `studio` command.
- **Impact**: Unlocks cloud infrastructure deployment directly from the Helios CLI, bringing the CLI closer to the V2 platform direction of being the primary interface for deployment.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/deploy.ts`: Contains the main command definition for `helios deploy` with subcommands for various cloud targets (e.g., AWS, GCP, Fly, Azure, Kubernetes, etc.).
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `registerDeployCommand`.
- **Read-Only**:
  - `AGENTS.md`: For constraints and architecture vision.
  - `packages/cli/src/utils/config.ts`: To read deployment configuration from `helios.config.json`.

#### 3. Implementation Spec
- **Architecture**: Use Commander.js subcommands to implement target-specific deployments (e.g., `helios deploy setup`, `helios deploy aws`, `helios deploy gcp`). Each subcommand should scaffold the necessary target-specific files (e.g., Dockerfiles, serverless function definitions) required to run Helios distributed rendering workers.
- **Pseudo-Code**:
  - Define `registerDeployCommand(program)`.
  - Add `program.command('deploy')` with subcommands for cloud providers.
  - In each subcommand action (e.g., `aws`), use prompts to confirm overwriting existing files, then write the scaffolded infrastructure files (like `function.json` for Azure, `job.yaml` for Kubernetes, `fly.toml` for Fly, etc.) from static templates to the project directory.
- **Public API Changes**: Exports `registerDeployCommand` from `packages/cli/src/commands/deploy.ts`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy aws` and verify that the expected AWS scaffolding files (like a Serverless template or Dockerfile) are created.
- **Success Criteria**: The command executes successfully and the correct cloud scaffolding files are generated in the current working directory without modifying existing files unless confirmed by the user.
- **Edge Cases**: Run the command when scaffolding files already exist; it should prompt the user before overwriting.
