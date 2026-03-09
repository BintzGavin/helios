#### 1. Context & Goal
- **Objective**: Update the Quickstart guide to emphasize the `helios init` command as the primary way to get started.
- **Trigger**: The backlog tracks a request to add/improve the Quickstart guide, and the current `docs/site/getting-started/quickstart.md` instructs users to clone the repository rather than using the CLI.
- **Impact**: Provides new users with a much faster, cleaner, and standard `npx helios init` experience instead of downloading the source repository, aligning with standard developer tool practices and the README recommendations.

#### 2. File Inventory
- **Create**: None
- **Modify**: `docs/site/getting-started/quickstart.md` - Update content to recommend `npx helios init` and the standard dev flow.
- **Read-Only**: `README.md`, `packages/studio/README.md` - To align the instructions.

#### 3. Implementation Spec
- **Architecture**: N/A - Documentation only.
- **Pseudo-Code**:
  - Update the "The Fastest Way to Start" section in `docs/site/getting-started/quickstart.md`.
  - Replace the "clone the repository" instructions with:
    1. Run `npx helios init <project-name>`
    2. Run `cd <project-name>`
    3. Run `npm install`
    4. Run `npm run dev` to launch Helios Studio
  - Keep the "What's Next" section intact.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cat docs/site/getting-started/quickstart.md`
- **Success Criteria**: The file reflects the `helios init` method instead of the git clone method.
- **Edge Cases**: Ensure the formatting remains valid Markdown.