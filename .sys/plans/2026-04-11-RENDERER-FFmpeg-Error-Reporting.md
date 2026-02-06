#### 1. Context & Goal
- **Objective**: Enhance FFmpeg error reporting by capturing and including the last 20 lines of stderr in the Error message.
- **Trigger**: Vision gap "Agent Experience First" -> "Clear error messages". Currently, FFmpeg errors just say "exited with code X", hiding the actual cause (logged to console but not in the error object). (Plan verified 2026-04-11).
- **Impact**: Improves debuggability for agents and developers by surfacing the root cause (e.g., "Unknown encoder", "Invalid argument") directly in the exception.

#### 2. File Inventory
- **Create**: `packages/renderer/tests/verify-ffmpeg-error.ts`
- **Modify**: `packages/renderer/src/Renderer.ts`
- **Read-Only**: `packages/renderer/src/types.ts`

#### 3. Implementation Spec
- **Architecture**: Add a stderr capture mechanism (limited buffer) to the `Renderer` class's FFmpeg process spawning logic.
- **Pseudo-Code**:
  ```typescript
  // In Renderer.ts render() method:
  const stderrLines: string[] = [];

  ffmpegProcess.stderr.on('data', (data: Buffer) => {
    const text = data.toString();
    console.error(`ffmpeg: ${text}`); // Maintain existing logging

    // Split into lines and accumulate
    const lines = text.split('\n');
    stderrLines.push(...lines);

    // Keep only last 20 lines to avoid memory growth
    if (stderrLines.length > 20) {
      stderrLines.splice(0, stderrLines.length - 20);
    }
  });

  // On process exit/error:
  if (code !== 0) {
    const errorLog = stderrLines.join('\n');
    const msg = `FFmpeg process exited with code ${code}. Last stderr output:\n${errorLog}`;
    reject(new Error(msg));
  }
  ```
- **Public API Changes**: None (Error message content improvement only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/verify-ffmpeg-error.ts`
- **Success Criteria**:
  1. The test configures `Renderer` with an invalid `videoCodec` (e.g., `invalid-codec`).
  2. The `render()` promise rejects.
  3. The caught Error message contains "Last stderr output:" AND the FFmpeg error details (e.g., "Unknown encoder 'invalid-codec'").
- **Edge Cases**:
  - FFmpeg exits immediately without stderr (message should handle empty log).
  - FFmpeg produces massive stderr (buffer limiting prevents memory issues).
