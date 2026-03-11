#### 1. Context & Goal
- **Objective**: Update the `docs/site/getting-started/quickstart.md` to recommend using the `npx helios init` CLI command.
- **Trigger**: The current Quickstart guide instructs users to clone the repository. The new intended developer workflow is using the `init` command.
- **Impact**: Improves the new user onboarding experience by providing a streamlined setup process via the CLI, eliminating manual cloning and setup steps.

#### 2. File Inventory
- **Create**: None
- **Modify**: `docs/site/getting-started/quickstart.md` - Update the "The Fastest Way to Start" section to feature the `npx helios init my-project` command.
- **Read-Only**: `packages/studio/README.md` - Reference for the `npx helios init` command usage and available frameworks.

#### 3. Implementation Spec
- **Architecture**: The documentation update aligns with the "CLI as first-class product surface" vision by highlighting the `init` command as the primary entry point.
- **Pseudo-Code**:
  - Read `docs/site/getting-started/quickstart.md`.
  - Locate the "The Fastest Way to Start" section.
  - Replace the "Using an Example" instructions (cloning the repo, npm install, npm run dev:react-dom) with the new CLI instructions:
    1. Run `npx helios init my-project`. Mention supported frameworks (React, Vue, Svelte, Solid, Vanilla).
    2. Run `cd my-project` and `npm install`.
    3. Run `npm run dev` to start the development server.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: Read `docs/site/getting-started/quickstart.md` to ensure the content reflects the new `init` command workflow.
- **Success Criteria**: The guide clearly instructs the user to run `npx helios init`, `cd`, `npm install`, and `npm run dev`. The instructions to clone the repo are removed.
- **Edge Cases**: None
