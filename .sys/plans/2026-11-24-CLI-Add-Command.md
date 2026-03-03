#### 1. Context & Goal
- **Objective**: Scaffold the `add` command for the component registry in the Helios CLI.
- **Trigger**: Vision gap. The AGENTS.md V2 vision and `docs/BACKLOG.md` explicitly list "Implement CLI command to fetch and copy components" (Registry Commands). The defined "Current State" shows only `helios studio` exists.
- **Impact**: Unlocks the ability for users to fetch and copy components from the Shadcn-style registry into their local repositories, fulfilling a primary V2 product surface requirement.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/add.ts` (Implementation of the new `add` command logic)
- **Modify**:
  - `packages/cli/src/index.ts` (Register the new `add` command with Commander.js)
- **Read-Only**: None required for this scaffolding step.

#### 3. Implementation Spec
- **Architecture**: Using Commander.js subcommands to add a new `add <component>` command. The initial implementation will scaffold the command structure, validate input, and log a placeholder message indicating future fetching logic.
- **Pseudo-Code**:
  ```typescript
  // In packages/cli/src/commands/add.ts
  import { Command } from 'commander';

  export function registerAddCommand(program: Command) {
    program
      .command('add <component>')
      .description('Fetch and copy a component from the registry')
      .action((component) => {
         console.log(`Fetching component: ${component} from registry...`);
         // TODO: Implement actual registry fetching logic
      });
  }

  // In packages/cli/src/index.ts
  import { registerAddCommand } from './commands/add.js';
  // ... existing setup ...
  registerAddCommand(program);
  ```
- **Public API Changes**: Exposes a new `helios add <component>` CLI command.
- **Dependencies**: No cross-domain dependencies. Must execute before actual registry client implementation can be integrated into the CLI.

#### 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli` if tests exist, or manually verify by running `node packages/cli/bin/helios.js add button`.
- **Success Criteria**: The CLI should successfully parse the `add button` command and output the placeholder message "Fetching component: button from registry..." without throwing errors.
- **Edge Cases**: Verify that missing the `<component>` argument results in a standard Commander.js error message (e.g., "error: missing required argument 'component'").
