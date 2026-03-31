#### 1. Context & Goal
- **Objective**: Implement CLI deployment scaffold commands for Tier 3 infrastructure adapters (`modal`, `deno`, and `vercel`).
- **Trigger**: The `ModalAdapter`, `DenoDeployAdapter`, and `VercelAdapter` (Tier 3 execution adapters) have been merged into `packages/infrastructure`, but lack corresponding scaffolding commands (`helios deploy [adapter]`) to generate necessary deployment configurations (e.g. `README.md` and basic scaffolding logic) for end users.
- **Impact**: Unlocks the end-to-end user journey for these platforms. This closes the gap between the infrastructure code implementation and the CLI user experience, fully realizing the "Primary interface for... deployment" vision for Tier 3 adapters.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/templates/modal.ts`: Contains templates for Modal deployment (e.g., `README-MODAL.md`).
  - `packages/cli/src/templates/deno.ts`: Contains templates for Deno Deploy (e.g., `README-DENO.md`).
  - `packages/cli/src/templates/vercel.ts`: Contains templates for Vercel deployment (e.g., `README-VERCEL.md`).
- **Modify**:
  - `packages/cli/src/commands/deploy.ts`: Add `.command('modal')`, `.command('deno')`, and `.command('vercel')` to the `deploy` command to interactively write out their respective templates.
- **Read-Only**:
  - `packages/infrastructure/src/adapters/modal-adapter.ts`
  - `packages/infrastructure/src/adapters/deno-deploy-adapter.ts`
  - `packages/infrastructure/src/adapters/vercel-adapter.ts`
  - `docs/BACKLOG.md`
  - `docs/status/CLI.md`

#### 3. Implementation Spec
- **Architecture**: Extend the existing `helios deploy` Commander.js subcommand structure. Create three new subcommands (`modal`, `deno`, `vercel`) that write corresponding READMEs describing environment prerequisites and job execution instructions to the user's working directory.
- **Pseudo-Code**:
  - Create `modal.ts`, `deno.ts`, `vercel.ts` in `packages/cli/src/templates/`. Each should export a `README_XXX_TEMPLATE` string with instructions on setting up the specific adapter (e.g. required environment variables matching the adapter configuration inputs).
  - In `packages/cli/src/commands/deploy.ts`:
    - Import the new templates.
    - Add `.command('modal')`, `.command('deno')`, and `.command('vercel')` definitions.
    - Each command's action block:
      - Defines target files (e.g., `path.join(cwd, 'README-MODAL.md')`).
      - Checks if the file exists and uses `prompts` to ask for overwrite confirmation if so.
      - Writes the template content to the file if allowed.
      - Logs success messages (e.g., `console.log(chalk.blue('\nModal setup complete!'));`).
- **Public API Changes**: Adds `modal`, `deno`, and `vercel` subcommands to the `helios deploy` command structure.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/cli/src/index.ts deploy modal`, `npx tsx packages/cli/src/index.ts deploy deno`, and `npx tsx packages/cli/src/index.ts deploy vercel` in a temporary directory.
- **Success Criteria**: Each command should execute successfully, output a colored success message, and the respective `README-*.md` file should exist in the directory with the expected template content.
- **Edge Cases**: Run each command a second time in the same directory. The interactive prompt should appear asking to overwrite. Selecting `N` should cancel the file write without error.
