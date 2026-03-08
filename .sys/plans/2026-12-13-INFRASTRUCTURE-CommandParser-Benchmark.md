#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `parseCommand` utility.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. Adding performance benchmarks for the command parsing utility is a permitted fallback action to establish performance baselines.
- **Impact**: Provides a measurable performance baseline for `parseCommand`, ensuring that future enhancements or refactoring do not introduce processing regressions when handling complex job strings.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/command.bench.ts`: Contains the Vitest benchmark suite for the `parseCommand` function.
- **Read-Only**:
  - `packages/infrastructure/src/utils/command.ts`: The implementation logic being benchmarked.

#### 3. Implementation Spec
- **Architecture**: Create a standard `vitest bench` suite that executes `parseCommand` over varying complexities of command strings.
- **Pseudo-Code**:
  ```typescript
  import { bench, describe } from 'vitest';
  import { parseCommand } from '../../src/utils/command.js';

  describe('parseCommand benchmarks', () => {
    bench('parseCommand - simple', () => {
      parseCommand('npm run build');
    });

    bench('parseCommand - quotes', () => {
      parseCommand('render --title "My Video"');
    });

    bench('parseCommand - escaped quotes', () => {
      parseCommand('render --title "My \\"Awesome\\" Video"');
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Command parsing happens frequently on worker initialization, so ensuring it's fast minimizes overhead on ephemeral stateless compute resources.

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure -- tests/benchmarks/command.bench.ts --run`
- **Success Criteria**: The command executes successfully without throwing "No test files found" and outputs `vitest bench` results showing the iterations per second.
- **Edge Cases**: None (benchmarks measure speed, functional edge cases belong in unit tests).
- **Integration Verification**: Not required.
