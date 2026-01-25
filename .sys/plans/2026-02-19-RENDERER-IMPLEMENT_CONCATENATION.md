# Spec: Implement Video Concatenation Utility

#### 1. Context & Goal
- **Objective**: Implement a `concatenate` utility to losslessly stitch video chunks using FFmpeg's `concat` demuxer.
- **Trigger**: Vision Gap - The README specifies that "Distributed Rendering" requires stitching chunks, which is currently missing in the renderer package.
- **Impact**: Enables distributed rendering workflows (e.g., AWS Lambda, Google Cloud Run) where multiple workers render frame ranges that must be assembled into a single final output.

#### 2. File Inventory
- **Create**: `packages/renderer/src/Concatenator.ts` - New file implementing the concatenation logic.
- **Create**: `packages/renderer/tests/verify-concat.ts` - New test script to verify functionality.
- **Modify**: `packages/renderer/src/index.ts` - Export the new utility function.
- **Read-Only**: `packages/renderer/src/Renderer.ts` - Reference for FFmpeg spawning patterns.

#### 3. Implementation Spec
- **Architecture**:
  - Standalone stateless utility function `concatenate(videoPaths: string[], outputPath: string): Promise<void>`.
  - Uses FFmpeg's `concat` demuxer protocol, which requires creating a temporary text file listing input files.
  - Performs a stream copy (`-c copy`) to ensure lossless, fast merging without re-encoding.
  - Handles cleanup of the temporary list file after execution.

- **Pseudo-Code**:
  - FUNCTION concatenate(videoPaths, outputPath):
    - VALIDATE that all paths in `videoPaths` exist on disk. IF NOT, throw Error.
    - GENERATE a temporary file path `list.txt` in the system temp directory.
    - PREPARE file content: For each path in `videoPaths`, append "file 'ABSOLUTE_PATH'" to content.
    - WRITE content to `list.txt`.
    - SPAWN FFmpeg process with arguments:
      - `-f concat`
      - `-safe 0` (allows unsafe file paths, required for absolute paths)
      - `-i list.txt`
      - `-c copy` (stream copy, no re-encoding)
      - `-y` (overwrite output)
      - `outputPath`
    - HANDLE process events:
      - ON 'close': IF code == 0, RESOLVE. ELSE REJECT.
      - ON 'error': REJECT.
    - FINALLY:
      - DELETE `list.txt` (ensure cleanup happens even on error).

- **Public API Changes**:
  - New export `concatenate` from `@helios-project/renderer`.

- **Dependencies**:
  - `fs` (Node.js built-in) for file operations.
  - `path` (Node.js built-in) for path resolution.
  - `os` (Node.js built-in) for temp directory.
  - `child_process` (Node.js built-in) for spawning FFmpeg.
  - `@ffmpeg-installer/ffmpeg` (Existing) for FFmpeg binary path.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-concat.ts`
- **Success Criteria**:
  - The test script generates two small video chunks (e.g., 1 second each) using the existing `Renderer`.
  - The script calls `concatenate` to merge them.
  - The script asserts `output.mp4` exists.
  - The script asserts `output.mp4` size is approximately the sum of the chunks.
- **Edge Cases**:
  - One of the input files is missing -> Should throw error.
  - Empty input list -> Should throw error or handle gracefully.
