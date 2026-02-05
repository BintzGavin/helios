# Context & Goal
- **Objective**: Implement `helios skills` command to install AI agent skills into user projects.
- **Trigger**: Vision gap in `README.md` ("Coming soon: Install Helios skills").
- **Impact**: Enables AI agents (like Cursor, Windsurf) to effectively use Helios by providing context and best practices directly in the user's project environment.

# File Inventory
- **Create**:
    - `packages/cli/src/commands/skills.ts`: Implementation of the `skills` command registration and logic.
- **Modify**:
    - `packages/cli/src/index.ts`: Register the new `skills` command.
    - `packages/cli/package.json`: Add build step to copy `.agents/skills` to `dist/skills`.
- **Read-Only**:
    - `.agents/skills/helios/`: Source directory of skills to be distributed.

# Implementation Spec
- **Architecture**:
    - The CLI package will bundle the skills directory as a static asset in `dist/skills`.
    - The `skills install` command will resolve this bundled directory relative to the executing CLI script.
    - It will copy the contents to `.agents/skills/helios` in the user's Current Working Directory (CWD), preserving structure.
    - This approach avoids runtime network dependencies for skills and ensures version alignment between the CLI and the skills it provides.

- **Pseudo-Code**:
    ```typescript
    // packages/cli/src/commands/skills.ts
    export function registerSkillsCommand(program) {
      program.command('skills')
        .command('install')
        .description('Install Helios AI agent skills')
        .action(async () => {
           // 1. Resolve source path: path.join(__dirname, '../../skills')
           //    (assuming dist/commands/skills.js -> dist/skills)

           // 2. Resolve target path: path.join(process.cwd(), '.agents/skills/helios')

           // 3. Recursive copy (using fs.cp or recursive read/write)
           //    fs.cpSync(source, target, { recursive: true })

           // 4. Log success message with instructions
           //    "Skills installed to .agents/skills/helios"
        });
    }
    ```

- **Build Process**:
    - Modify `packages/cli/package.json` scripts:
        - `"build": "tsc && cp -r ../../.agents/skills/helios dist/skills"`
        - (Or use a cross-platform copy utility if available, but standard cp is acceptable for this env)

- **Public API Changes**:
    - New CLI command: `npx helios skills install`

- **Dependencies**: None.

# Test Plan
- **Verification**:
    1. Run `npm run build` in `packages/cli`.
    2. Verify `packages/cli/dist/skills` exists.
    3. Run `node packages/cli/dist/bin/helios.js skills install` in a temporary test directory.
    4. Check that `.agents/skills/helios` is created in the test directory and contains `core/SKILL.md`.
- **Success Criteria**: The command runs without error and files are identical to source.
- **Edge Cases**:
    - Target directory already exists: Overwrite without prompt (idempotent).
    - Source directory missing (build error): Command should fail gracefully with "Skills not found in installation".
