#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `parseCommand` utility.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. According to `AGENTS.md`, when no feature gaps exist, the agent must focus on allowed fallback actions such as Benchmarks.
- **Impact**: Establishes a performance baseline for the command parsing state machine, ensuring optimal performance for distributed render commands executed on workers.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/command.bench.ts`
- **Modify**:
  - None
- **Read-Only**:
  - `packages/infrastructure/src/utils/command.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Utilize `vitest bench` to measure the performance of the `parseCommand` utility.
  - Establish multiple benchmark scenarios:
    1. **Simple Command**: Command with no quotes or escapes (e.g., `npm run test`).
    2. **Command with Quotes**: Command containing quoted arguments (e.g., `render --title "My Awesome Render" --fps 30`).
    3. **Command with Many Arguments**: Command with a large number of space-separated arguments.
    4. **Command with Escaped Characters**: Command containing escaped characters (e.g., `echo "Hello \\"World\\""`).
- **Pseudo-Code**:
  ```typescript
  import { bench, describe } from 'vitest';
  import { parseCommand } from '../../src/utils/command.js';

  describe('Command Parser Benchmarks', () => {
    bench('parseCommand - Simple command', () => {
      parseCommand('npm run test');
    });

    bench('parseCommand - Command with quotes', () => {
      parseCommand('render --title "My Awesome Render" --fps 30');
    });

    bench('parseCommand - Command with many arguments', () => {
      parseCommand('cmd arg1 arg2 arg3 arg4 arg5 arg6 arg7 arg8 arg9 arg10');
    });

    bench('parseCommand - Command with escaped characters', () => {
      parseCommand('echo "Hello \\\\\\"World\\\\\\""');
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Not applicable. This is a local utility function benchmark.

#### 4. Test Plan
- **Verification**: Run `npm run bench -w packages/infrastructure -- tests/benchmarks/command.bench.ts --run`
- **Success Criteria**: The benchmarks execute successfully without timeout or errors, reporting stable performance metrics for all execution scenarios.
- **Edge Cases**: None.
- **Integration Verification**: Ensure `parseCommand` correctness tests continue to pass in `tests/command.test.ts` via `npm test -w packages/infrastructure`.
