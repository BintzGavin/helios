#### 1. Context & Goal
- **Objective**: Implement missing test coverage for `deploy.ts` cancellation branches.
- **Trigger**: Coverage report indicates lines 936-937, 973-974 and similar cancellation lines are uncovered for recent cloud adapters.
- **Impact**: Attain 100% test coverage for the CLI `deploy.ts` command to adhere to the verification and definition of done rules.

#### 2. File Inventory
- **Modify**: `packages/cli/src/commands/__tests__/deploy.test.ts` - Add new tests mocking `prompts` to return `{ value: undefined }` to trigger the `process.exit(0)` branches for all recent cloud deployment templates.

#### 3. Implementation Spec
- **Architecture**: In `deploy.test.ts`, for the `deno`, `vercel`, `modal`, and `hetzner` subcommands, we will add an explicit test checking that when `prompts` returns `undefined`, `process.exit(0)` is called.
- **Pseudo-Code**:
  ```javascript
  it('should exit if prompt is cancelled', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(prompts).mockResolvedValue({ value: undefined });

    await program.parseAsync(['node', 'test', 'deploy', 'deno']);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
  ```
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `cd packages/cli && npx vitest run --coverage src/commands/__tests__/deploy.test.ts`
- **Success Criteria**: Line coverage for `deploy.ts` reaches 100%.
- **Edge Cases**: Verify that the mocked `process.exit` acts properly and prevents subsequent execution logic.
