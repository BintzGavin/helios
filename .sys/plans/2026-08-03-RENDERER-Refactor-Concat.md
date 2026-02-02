# Refactor Concat to Pipe

#### 1. Context & Goal
- **Objective**: Refactor the `concatenateVideos` utility in `packages/renderer/src/concat.ts` to pipe the file list directly to FFmpeg's stdin, eliminating the need to write and delete a temporary text file on disk.
- **Trigger**: Vision alignment with the "Zero Disk I/O" architectural principle documented in the README.
- **Impact**: Improves cleanliness and robustness by preventing orphaned temporary files in case of process crashes, and reduces unnecessary filesystem operations.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/concat.ts` (Refactor `concatenateVideos` function)
- **Read-Only**: `packages/renderer/tests/verify-concat.ts` (Use existing verification script)

#### 3. Implementation Spec
- **Architecture**:
  - Replace the file-based approach (`-i list.txt`) with the pipe-based approach (`-i -` or `-i pipe:0`).
  - Configure the `spawn` process to allow writing to `stdin`.
  - Write the formatted file list string directly to the FFmpeg process's standard input stream.
- **Pseudo-Code**:
  ```typescript
  // 1. Generate list content string (same logic as before)
  const listContent = inputPaths.map(...).join('\n');

  // 2. Spawn FFmpeg with pipe input
  const args = ['-f', 'concat', '-safe', '0', '-i', '-', '-c', 'copy', '-y', outputPath];
  const process = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] }); // Ensure stdin is 'pipe'

  // 3. Write content to stdin
  process.stdin.write(listContent);
  process.stdin.end();

  // 4. Handle process exit and error (same logic, but remove fs.unlink calls)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the existing concatenation verification script.
  `npx tsx packages/renderer/tests/verify-concat.ts`
- **Success Criteria**: The script should output `✅ Verification Passed!` and produce a valid, non-empty concatenated video file.
- **Edge Cases**: Verify behavior with paths containing spaces (handled by existing escaping logic).
