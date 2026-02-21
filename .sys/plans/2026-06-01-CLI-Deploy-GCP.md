# 2026-06-01-CLI-Deploy-GCP.md

#### 1. Context & Goal
- **Objective**: Implement `helios deploy gcp` command to scaffold Google Cloud Run Job configuration for distributed rendering.
- **Trigger**: Vision gap in "Distributed Rendering" ("suitable for cloud execution") and empty "Cloud execution adapter" backlog item.
- **Impact**: Enables users to deploy distributed rendering jobs to Google Cloud Run, moving beyond local-only execution.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/gcp.ts`: Contains templates for `cloud-run-job.yaml` and `README-GCP.md`.
- **Modify**:
  - `packages/cli/src/commands/deploy.ts`: Register the `gcp` subcommand and implement scaffolding logic.
  - `packages/cli/src/commands/__tests__/deploy.test.ts`: Add unit tests for the `gcp` subcommand.
- **Read-Only**:
  - `packages/cli/src/templates/docker.ts`: For reference on template structure.

#### 3. Implementation Spec
- **Architecture**:
  - Use Commander.js to add `deploy gcp` subcommand.
  - Prompt user for confirmation before overwriting existing files (`cloud-run-job.yaml`, `README-GCP.md`).
  - Generate `cloud-run-job.yaml` with placeholders for image name and task count.
  - Generate `README-GCP.md` with step-by-step instructions (Build, Push, Deploy, Execute).
  - The generated job config will set the container command to `helios job run job.json --chunk ${CLOUD_RUN_TASK_INDEX}`.
- **Pseudo-Code**:
  ```typescript
  program.command('deploy')
    .command('gcp')
    .description('Scaffold Google Cloud Run Job configuration')
    .action(async () => {
      // Check if cloud-run-job.yaml exists
      // Check if README-GCP.md exists
      // Prompt to overwrite if needed (using prompts)
      // Write cloud-run-job.yaml from template
      // Write README-GCP.md from template
      // Print success message
    });
  ```
- **Public API Changes**:
  - New CLI command: `helios deploy gcp`
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test packages/cli/src/commands/__tests__/deploy.test.ts` to verify unit tests.
  - Create a manual verification script `tests/manual/verify-deploy-gcp.sh` to run the command in a temp dir and check file contents.
- **Success Criteria**:
  - Unit tests pass.
  - `cloud-run-job.yaml` contains correct `helios job run` command with chunk index variable.
  - `README-GCP.md` contains deployment instructions.
- **Edge Cases**:
  - Files already exist (should prompt).
  - User declines overwrite (should skip).
