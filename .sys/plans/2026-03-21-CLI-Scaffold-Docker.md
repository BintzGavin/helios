#### 1. Context & Goal
- **Objective**: Scaffold the `helios deploy docker` command to generate deployment configuration for Docker execution.
- **Trigger**: The V2 vision explicitly targets Docker as a supported adapter for distributed rendering. While `helios deploy setup` currently scaffolds a basic Dockerfile, it lacks consistency with other adapters (e.g., `deploy aws`, `deploy fly`) which provide explicit instructions via READMEs and use explicit cloud provider commands.
- **Impact**: Aligns the Docker deployment workflow with the rest of the CLI, providing users with a clear path to utilize the `DockerAdapter` for distributed rendering, local swarms, and CI environments.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/cli/src/templates/docker.ts`: Export a new `README_DOCKER_TEMPLATE` string containing deployment instructions for Docker.
  - `packages/cli/src/commands/deploy.ts`: Add `docker` command (aliasing or replacing `setup`) to scaffold `Dockerfile`, `docker-compose.yml`, and `README-DOCKER.md`.
- **Read-Only**: None.

#### 3. Implementation Spec
- **Architecture**: Extend the existing Commander.js subcommand for Docker. Ensure it writes `Dockerfile`, `docker-compose.yml`, and `README-DOCKER.md` using the templates. The prompt for overwriting existing files should be consistent with other adapters.
- **Pseudo-Code**:
  - In `packages/cli/src/templates/docker.ts`, export a new string constant containing the Docker README template.
  - In `packages/cli/src/commands/deploy.ts`, register the docker subcommand. The command should:
    - Scaffold `Dockerfile` from the dockerfile template.
    - Scaffold `docker-compose.yml` from the compose template.
    - Scaffold `README-DOCKER.md` from the readme template.
- **Public API Changes**: `helios deploy docker` command added to the CLI.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy docker` in a temporary directory.
- **Success Criteria**: Verify `Dockerfile`, `docker-compose.yml`, and `README-DOCKER.md` are generated successfully and contain the correct template content.
- **Edge Cases**: Prompts for overwriting existing files should be handled correctly.