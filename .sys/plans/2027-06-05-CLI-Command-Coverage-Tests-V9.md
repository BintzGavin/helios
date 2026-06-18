# CLI Command Coverage Tests Spec V9

## 1. Context & Goal
- **Objective**: Improve the test coverage for the `deploy` command to cover the exit/cancel condition when prompting for file overwriting.
- **Trigger**: The recent coverage run shows that the lines checking `typeof response.value === 'undefined'` in the deploy subcommands are not covered.
- **Impact**: Getting to 100% test coverage in the CLI module.

## 2. File Inventory
- **Create**: none
- **Modify**: `packages/cli/src/commands/__tests__/deploy.test.ts`
- **Read-Only**: `packages/cli/src/commands/deploy.ts`

## 3. Implementation Spec
- **Architecture**: In the deploy unit tests, I will add a new test case for each of the subcommands (like `setup`, `gcp`, `aws`, `cloudflare`, `cloudflare-sandbox`, `fly`, `azure`, `kubernetes`, `hetzner`, `modal`, `deno`, `vercel`) that mimics the user cancelling the prompt (Ctrl+C). This is achieved by having `prompts` resolve with an empty object `{}` so `response.value` is undefined. I will mock `process.exit` and assert it is called.
- **Pseudo-Code**:
  ```pseudo-code
    mock fs.existsSync to return true
    mock prompts to return {}
    mock process.exit

    call program.parseAsync with deploy subcommand

    expect process.exit to have been called with 0

    restore mockExit


  ```
- **Public API Changes**: none.
- **Dependencies**: none.

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/cli -- --coverage`
- **Success Criteria**: The coverage report shows `packages/cli/src/commands/deploy.ts` branch and statement coverage at 100%. Uncovered lines 936-937, 973-974 and similar missing lines are gone.
- **Edge Cases**: Make sure to restore the mock of `process.exit` correctly to avoid issues with other tests. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
