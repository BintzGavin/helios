#### 1. Context & Goal
- **Objective**: Implement `helios deploy kubernetes` to scaffold deployment configuration files for Kubernetes distributed rendering.
- **Trigger**: The Infrastructure agent completed the `KubernetesAdapter` for distributed rendering (Tier 2 Cloud Execution Adapter), but the CLI lacks a command to easily deploy the required Kubernetes Job template, leaving a gap in the product surface for cloud deployment workflows.
- **Impact**: Unlocks enterprise-standard distributed rendering by allowing users to easily deploy their rendering workload onto any existing Kubernetes cluster.

#### 2. File Inventory
- **Create**: `packages/cli/src/templates/kubernetes.ts` (Exports strings for `KUBERNETES_JOB_TEMPLATE` and `README_KUBERNETES_TEMPLATE`)
- **Modify**: `packages/cli/src/commands/deploy.ts` (Add the `kubernetes` subcommand to `helios deploy` to write the files)
- **Read-Only**: `packages/infrastructure/src/adapters/kubernetes-adapter.ts`

#### 3. Implementation Spec
- **Architecture**: Extend the existing `helios deploy` Commander.js subcommand structure. Create a new `kubernetes` command that writes a `job.yaml` (a Kubernetes `BatchV1` Job definition) and a `README-KUBERNETES.md` file to the user's current working directory.
- **Pseudo-Code**:
  - In `packages/cli/src/templates/kubernetes.ts`, define `KUBERNETES_JOB_TEMPLATE` with standard K8s Job yaml containing the `helios-renderer` image and basic env configurations. Define `README_KUBERNETES_TEMPLATE` with instructions to apply the job and use the CLI adapter.
  - In `packages/cli/src/commands/deploy.ts`, import templates.
  - Add `deploy.command('kubernetes')` action.
  - Check if `job.yaml` and `README-KUBERNETES.md` exist. Prompt user to overwrite using `prompts` if they do.
  - Write templates to disk.
  - Log success message.
- **Public API Changes**: Adds `kubernetes` subcommand to `helios deploy`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy kubernetes` in a temporary directory.
- **Success Criteria**: The command should execute successfully, output a success message, and `job.yaml` and `README-KUBERNETES.md` should exist in the directory with the expected content.
- **Edge Cases**: Run the command again to verify the interactive overwrite prompt works correctly (should not overwrite if "no" is selected).
