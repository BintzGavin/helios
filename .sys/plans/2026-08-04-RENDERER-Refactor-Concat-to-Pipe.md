# Plan: Refactor Concat to Pipe

## 1. Context & Goal
- **Objective**: Refactor `concatenateVideos` to pipe the file list to FFmpeg's `stdin` instead of writing a temporary text file to disk.
- **Trigger**: "Zero Disk I/O" vision gap identified in journal `[2026-08-03]`.
- **Impact**: Removes the last remaining disk write operation in the rendering pipeline (excluding final output), improving performance and security, and fully achieving the "Zero Disk I/O" architectural goal.

## 2. File Inventory
- **Modify**: `packages/renderer/src/concat.ts` (Refactor `concatenateVideos` to use stdin piping)
- **Read-Only**: `packages/renderer/tests/verify-concat.ts` (Use for verification)

## 3. Implementation Spec
- **Architecture**:
  - Update `concatenateVideos` to construct the file list string in memory (as it already does).
  - Spawn FFmpeg with `-f concat -safe 0 -protocol_whitelist file,pipe -i -` (reading from stdin).
  - Write the list content directly to the spawned process's `stdin` and close it.
  - Remove all filesystem operations related to the temporary list file (`fs.writeFile`, `fs.unlink`).

- **Pseudo-Code**:
  ```typescript
  FUNCTION concatenateVideos(inputPaths, outputPath, options)
    VALIDATE inputPaths

    // Create file list content (same as before)
    SET listContent = inputPaths.MAP(path -> "file '" + ABSOLUTE_PATH(path) + "'").JOIN("\n")

    SET args = [
      '-f', 'concat',
      '-safe', '0',
      '-protocol_whitelist', 'file,pipe', // Allow reading files from disk via pipe list
      '-i', '-', // Read list from stdin
      '-c', 'copy',
      '-y',
      outputPath
    ]

    SPAWN ffmpeg with args
    WRITE listContent to process.stdin
    END process.stdin

    AWAIT process close
      IF code == 0 RESOLVE
      ELSE REJECT
  END FUNCTION
  ```

## 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-concat.ts`
- **Success Criteria**:
  - The test script runs successfully and outputs "✅ Verification Passed!".
  - No temporary `.txt` files are created in the output directory.
- **Edge Cases**:
  - Empty file list (handled by existing check).
  - Paths with spaces/special characters (handled by existing logic, preserved).

## 5. Pre-commit Steps
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
