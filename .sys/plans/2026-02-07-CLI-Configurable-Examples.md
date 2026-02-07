# Plan: Configurable Example Registry for CLI Init

## 1. Context & Goal
- **Objective**: Allow users to specify a custom repository source for examples when running `helios init`.
- **Trigger**: Backlog item "Make example registry configurable (remove hardcoded URL)".
- **Impact**: Enables users to use private or community-hosted example repositories, supporting the "Shadcn-style" registry vision where users own their code.

## 2. File Inventory
- **Modify**: `packages/cli/src/commands/init.ts` (Add `--repo` flag and pass to utils)
- **Modify**: `packages/cli/src/utils/examples.ts` (Update fetch/download logic to use dynamic repo)

## 3. Implementation Spec

### Architecture
- The `helios init` command will accept a `--repo <repo>` argument.
- The default value will be `BintzGavin/helios/examples` (preserving current behavior).
- `fetchExamples` will parse this argument to construct the GitHub API URL for listing contents.
- `downloadExample` will use this argument as the base path for `degit`.

### Pseudo-Code

#### `packages/cli/src/commands/init.ts`
```typescript
// Update command registration
program
  .command('init [target]')
  // ... existing options
  .option('--repo <repo>', 'Example repository (user/repo or user/repo/path)', 'BintzGavin/helios/examples')
  .action(async (target, options) => {
     // ...
     // Pass options.repo to functions
     if (mode === 'example') {
        const examples = await fetchExamples(options.repo);
        // ...
        await downloadExample(selectedExample, targetDir, options.repo);
     }
  });
```

#### `packages/cli/src/utils/examples.ts`
```typescript
export async function fetchExamples(repoPath: string): Promise<string[]> {
  // 1. Parse repoPath (e.g., "user/repo/subdir" or "user/repo")
  //    - Split by "/"
  //    - Extract owner, repo, and optional path
  //    - Handle potential branch (e.g., "user/repo#branch") - complexity: basic support for now

  // 2. Construct GitHub API URL
  //    https://api.github.com/repos/{owner}/{repo}/contents/{path}

  // 3. Fetch and return directory names
  //    (Existing logic)
}

export async function downloadExample(name: string, targetDir: string, repoBase: string): Promise<void> {
  const src = `${repoBase}/${name}`; // e.g., "BintzGavin/helios/examples/promo-video"
  const emitter = degit(src, ...);
  await emitter.clone(targetDir);
}
```

### Public API Changes
- New CLI Option: `helios init --repo <repo>`

### Dependencies
- None.

## 4. Test Plan
- **Verification**:
  1. Run `helios init --example promo-video --repo BintzGavin/helios/examples` (Explicit default)
  2. Run `helios init --example promo-video` (Implicit default)
  3. Run `helios init` (Interactive) -> Check if listing works.

- **Success Criteria**:
  - `helios init` continues to work for default examples.
  - Specifying the default repo explicitly works.

- **Edge Cases**:
  - Invalid repo URL (fetch should fail gracefully, fallback to template).
  - Repo with no examples (empty list).

- **Pre-Commit Steps**:
  - Run `npm run build` in `packages/cli` to verify type safety.
  - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
