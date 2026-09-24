1. **Modify `packages/studio/src/context/StudioContext.test.tsx` to add test cases**
   - Execute the following command to append the new tests using `replace_with_git_merge_diff`:
   ```bash
   node -e '
   // This will be done using the replace_with_git_merge_diff tool in practice.
   // Providing exact diff:
   '
   ```
   *Note: I will use the `replace_with_git_merge_diff` tool directly to insert the following tests at the end of the `describe` block in `StudioContext.test.tsx`:*
   - A test for `cancelExport` initializing the exporter via `exportVideo` and triggering `abort()`.
   - A test for `exportJobSpec` successfully creating and clicking a download anchor.
   - A test for `exportJobSpec` failing network request and triggering `addToast` error.

2. **Verify modifications**
   - Use `git diff packages/studio/src/context/StudioContext.test.tsx` to verify the tests were correctly added.

3. **Verify coverage improvements**
   - Run `cd packages/studio && npx vitest run src/context/StudioContext.test.tsx --coverage` to confirm that lines 891-892 and 897-939 in `src/context/StudioContext.tsx` are now fully covered.

4. **Run all workspace tests**
   - Run `cd packages/studio && npm run test` to verify no regressions were introduced.

5. **Pre-commit step**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

6. **Submit changes**
   - Submit the completed code changes.
