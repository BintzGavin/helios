#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `parseCommand` utility.
- **Trigger**: The INFRASTRUCTURE domain has reached gravitational equilibrium with the V2 vision. Adding performance benchmarks for the command parsing utility is a permitted fallback action to establish performance baselines.
- **Impact**: Provides a measurable performance baseline for `parseCommand`, ensuring that future enhancements or refactoring do not introduce processing regressions when handling complex job strings.

#### 2. File Inventory
- **Create**: `packages/infrastructure/tests/benchmarks/command.bench.ts`
  - Purpose: Contains the Vitest benchmark suite for the `parseCommand` function.
- **Read-Only**: `packages/infrastructure/src/utils/command.ts`

#### 3. Implementation Spec
- **Architecture**: Create a standard `vitest bench` suite that executes `parseCommand` over varying complexities of command strings.
- **Pseudo-Code**:
  - Import `bench` and `describe` from `vitest`.
  - Import `parseCommand` from `../../src/utils/command.js`.
  - Define a benchmark `parseCommand - simple` using a basic string like `npm run build`.
  - Define a benchmark `parseCommand - quotes` using a string with quotes like `render --title "My Video"`.
  - Define a benchmark `parseCommand - escaped quotes` using a string with escaped quotes.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Command parsing happens frequently on worker initialization, so ensuring it's fast minimizes overhead on ephemeral stateless compute resources.

#### 4. Test Plan
- **Verification**: `npm run bench -w packages/infrastructure -- tests/benchmarks/command.bench.ts --run`
- **Success Criteria**: The command executes successfully without throwing "No test files found" and outputs `vitest bench` results showing the iterations per second.
- **Edge Cases**: None (benchmarks measure speed, functional edge cases belong in unit tests).
- **Integration Verification**: Not required.
