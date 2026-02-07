# 2025-02-18-CLI-Skills-Command.md

#### 1. Context & Goal
- **Objective**: Implement `helios skills install` to distribute AI agent skills to user projects.
- **Trigger**: `AGENTS.md` ("Skills: ACTIVELY EXPANDING") and Memory ("packages/cli build process bundles..."). The current CLI lacks the command to install these skills, leaving agentic workflows incomplete in user projects.
- **Impact**: Enables AI agents in user projects to have the necessary context/skills to work with Helios V2, fulfilling the "Primary interface" role of the CLI.

#### 2. File Inventory
- **Create**:
  - `packages/cli/scripts/bundle-skills.js`: Build script to copy `.agents/skills/helios` to `dist/skills`.
  - `packages/cli/src/commands/skills.ts`: Implementation of the `skills install` command.
- **Modify**:
  - `packages/cli/package.json`: Update `build` script to execute `bundle-skills.js`.
  - `packages/cli/src/index.ts`: Register the new `skills` command.
- **Read-Only**:
  - `.agents/skills/helios/`: Source of skills to bundle.

#### 3. Implementation Spec
- **Architecture**:
  - **Build Time**: A Node.js script (`bundle-skills.js`) copies the workspace's `.agents/skills/helios` directory to `packages/cli/dist/skills` after `tsc` compilation.
  - **Run Time**: The `helios skills install` command locates the bundled `skills` directory relative to the executing module and recursively copies it to the user's project (`.agents/skills/helios`).
- **Pseudo-Code**:
  - **bundle-skills.js**:
    - Resolve source: `../../.agents/skills/helios`
    - Resolve target: `./dist/skills`
    - Recursively copy files (using `fs.cpSync` or manual recursion).
  - **src/commands/skills.ts**:
    - Register command `skills`.
    - Subcommand `install`.
    - Resolve source: `path.join(dirname(fileURLToPath(import.meta.url)), '../skills')` (adjusting for `dist/commands/` vs `dist/skills`).
    - Resolve target: `path.join(process.cwd(), '.agents/skills/helios')`.
    - Check if source exists.
    - Copy files to target (creating directories).
    - Log success.
- **Public API Changes**:
  - New CLI command: `helios skills install`.
- **Dependencies**: None (uses standard `fs`, `path`, `url`).

#### 4. Test Plan
- **Verification**:
  1. Run `npm run build` in `packages/cli`.
  2. Verify `packages/cli/dist/skills` contains `SKILL.md` (and other files).
  3. Create a temporary test directory.
  4. Run `node <path-to-cli>/bin/helios.js skills install` in the test directory.
  5. Verify `.agents/skills/helios` is created and populated in the test directory.
  6. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
- **Success Criteria**: The skills directory is correctly bundled and then correctly installed in a target project.
- **Edge Cases**:
  - Source skills directory missing (should warn/fail gracefully during build).
  - Target directory already exists (should overwrite or warn - overwriting is preferred for updates).
