#### 1. Context & Goal
- **Objective**: Implement `helios deploy hetzner` to scaffold deployment files (e.g., `README-HETZNER.md`) for Hetzner Cloud.
- **Trigger**: `HetznerCloudAdapter` was recently added to `packages/infrastructure` (Tier 3) but lacks a corresponding CLI deploy scaffolding command, blocking the complete user journey for this cloud execution adapter.
- **Impact**: Unlocks end-to-end usage of the Hetzner Cloud rendering adapter by providing users with the necessary infrastructure setup code and instructions.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/hetzner.ts`: Contains templates for Hetzner deployment (e.g., `README-HETZNER.md`).
- **Modify**:
  - `packages/cli/src/commands/deploy.ts`: Add `.command('hetzner')` to the `deploy` command to write out the Hetzner templates.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/hetzner-cloud-adapter.ts`: To understand what the adapter requires for accurate documentation.

#### 3. Implementation Spec
- **Architecture**: Extend the existing `helios deploy` Commander.js subcommand structure. Create a new `hetzner` command that writes a `README-HETZNER.md` file to the user's current working directory.
- **Pseudo-Code**:
  - In `packages/cli/src/templates/hetzner.ts`, define `README_HETZNER_TEMPLATE`.
  - In `packages/cli/src/commands/deploy.ts`, import templates.
  - Add `deploy.command('hetzner')` action.
  - Check if `README-HETZNER.md` exists. Prompt user to overwrite if it does.
  - Write templates to disk.
  - Log success message.
- **Public API Changes**: Adds `hetzner` subcommand to `helios deploy`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy hetzner` in a temporary directory.
- **Success Criteria**: The command should execute successfully, output a success message, and `README-HETZNER.md` should exist in the directory with the expected content.
- **Edge Cases**: Run the command again to verify the interactive overwrite prompt works correctly (should not overwrite if "no" is selected).
