#### 1. Context & Goal
- **Objective**: Implement robust command parsing and perform package housekeeping.
- **Trigger**: The current `parseCommand` implementation in `packages/infrastructure/src/utils/command.ts` naively splits strings by whitespace, which breaks commands containing quoted arguments with spaces (e.g., `-metadata title="My Render"`). Package `version` is outdated (0.1.0) and a `lint` script is missing.
- **Impact**: Ensures distributed render commands execute correctly on workers when they contain complex arguments. Improves CI/CD consistency by enabling linting.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/utils/command.test.ts` (Tests for robust command parsing)
- **Modify**:
  - `packages/infrastructure/src/utils/command.ts` (Implement robust parsing handling quotes)
  - `packages/infrastructure/package.json` (Update version to 0.12.0 and add `lint` script)
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Refactor `parseCommand` to use a state-machine or regex approach to correctly tokenize strings, respecting single and double quotes. Update package configuration to match current infrastructure state.
- **Pseudo-Code**:
```typescript
  // In command.ts
  export function parseCommand(commandString: string): { command: string, args: string[] } {
    // 1. Check for empty string
    // 2. Iterate through characters, tracking state:
    //    - inside single quote
    //    - inside double quote
    //    - escaping
    // 3. Build tokens based on state
    // 4. Return first token as command, rest as args
  }
```
- **Public API Changes**: No changes to the exported signature of `parseCommand` (`(commandString: string) => { command: string, args: string[] }`), only internal behavior.
- **Dependencies**: None.
- **Cloud Considerations**: Robust command execution is critical for executing `RenderExecutor` tasks correctly in cloud environments (like AWS Lambda and Cloud Run) where arguments may be dynamically generated and contain complex strings.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm run test`
- **Success Criteria**: All tests pass, including new test cases for `parseCommand` that verify correct parsing of strings with quotes and spaces. `npm run lint` executes successfully.
- **Edge Cases**: Unmatched quotes, escaped quotes, mixed quotes, multiple spaces between arguments, empty arguments.
- **Integration Verification**: Verify that a script with `npm run lint` runs without errors.