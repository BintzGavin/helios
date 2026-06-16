# CLI Command Coverage Tests V8 Spec

## 1. Context & Goal
- **Objective**: Improve regression test coverage for `packages/cli/src/commands/job.ts` to 100%.
- **Trigger**: `vitest run --coverage` reveals uncovered branch lines for `--docker-args` and `--hetzner-ssh-key-id` parsing.
- **Impact**: Full branch coverage for CLI commands ensures adapter configuration edge-cases work properly.

## 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/__tests__/job.test.ts`
- **Read-Only**: `packages/cli/src/commands/job.ts`

## 3. Implementation Spec
- **Architecture**:
  - Add specific mock implementations and execute the `job run` command with the precise missing flags: `--docker-args` (to hit line 175) and `--hetzner-ssh-key-id` (to hit line 210).
- **Pseudo-Code**:
  - In `job.test.ts` add a test case: `it('should pass docker args correctly')` with `['run', 'job.json', '--adapter', 'docker', '--docker-image', 'x', '--docker-args', 'a,b']`
  - In `job.test.ts` add a test case: `it('should pass hetzner ssh key id correctly')` with `['run', 'job.json', '--adapter', 'hetzner', '--hetzner-api-token', 't', '--hetzner-server-type', 's', '--hetzner-image', 'i', '--hetzner-ssh-key-id', '123']`
- **Public API Changes**: None
- **Dependencies**: None

## 4. Test Plan
- **Verification**: Run `cd packages/cli && npx vitest run --coverage src/commands/__tests__/job.test.ts`
- **Success Criteria**: Coverage report shows 100% Branch coverage for `job.ts` with no missing lines.
- **Edge Cases**: None.
