#### 1. Context & Goal
- **Objective**: Update the Quickstart documentation to use the new CLI init command.
- **Trigger**: Backlog item (`docs/status/STUDIO.md`: `⏳ Planned: Update Quickstart Guide`). The current Quickstart guide instructs users to clone the repo, which is outdated for V2.
- **Impact**: Provides users with the correct, modern way to scaffold new Helios projects (`npx helios init`), aligning with the Studio vision and reducing friction for new users.

#### 2. File Inventory
- **Create**: None
- **Modify**: `docs/site/getting-started/quickstart.md` (Update instructions to use `npx helios init` instead of `git clone`)
- **Read-Only**: `packages/studio/README.md` (To reference the correct CLI commands and messaging)

#### 3. Implementation Spec
- **Architecture**: Documentation update only. The content should guide the user through:
  1. Running `npx helios init my-project`
  2. Navigating to the directory (`cd my-project`)
  3. Installing dependencies (`npm install`)
  4. Starting the studio (`npm run dev`)
- **Pseudo-Code**:
  - Remove the "Using an Example" section that relies on `git clone`.
  - Add a new "Initializing a Project" section featuring the `npx helios init` command.
  - Briefly mention the available framework templates (React, Vue, Svelte, Solid, Vanilla).
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cat docs/site/getting-started/quickstart.md`
- **Success Criteria**: The file prominently features the `npx helios init` command and no longer instructs users to clone the main repository for basic setup.
- **Edge Cases**: None