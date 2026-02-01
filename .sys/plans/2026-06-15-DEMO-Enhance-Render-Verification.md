# Enhance Render Verification

#### 1. Context & Goal
- **Objective**: Enhance `tests/e2e/verify-render.ts` to strictly verify output video content (duration, stream presence, and non-black content) to prevent silent rendering failures.
- **Trigger**: A recent regression in `examples/promo-video` caused it to render a black video while the test script reported "Success" because it only checked for file existence.
- **Impact**: Ensures the CI pipeline catches "silent" rendering failures where the video is produced but lacks content or valid streams.
- **Dependencies**: None (ffmpeg/ffprobe are already required for Renderer).

#### 2. File Inventory
- **Modify**: `tests/e2e/verify-render.ts`
  - Add content verification logic using `ffprobe` and `ffmpeg`.

#### 3. Implementation Spec
- **Architecture**:
  - Add a new helper function `verifyVideoContent(filePath: string, expectedDuration: number): Promise<void>`.
  - Use `child_process.execFile` or `spawn` to run `ffprobe` and `ffmpeg`.
  - **Check 1: Metadata**: Use `ffprobe` to verify:
    - Duration matches expected duration (within 1s tolerance).
    - Video stream exists and has correct dimensions.
  - **Check 2: Content (Non-Black)**: Use `ffmpeg` to extract a single frame at 50% duration and inspect pixel data using the `signalstats` filter.
    - Command: `ffmpeg -ss <mid> -i <file> -vframes 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=pipe:1" -f null -`
    - Parse the output for `lavfi.signalstats.YMAX`.
    - Assert that `YMAX` is greater than a minimal threshold (e.g., > 16, which is standard video black level, or just > 0 to be safe against pure black).
    - This deterministic check ensures the rendered video is not a blank canvas.

- **Pseudo-Code**:
  ```typescript
  async function verifyVideoContent(filePath, expectedDuration) {
    // 1. Run ffprobe
    const probe = await run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-print_format', 'json', filePath]);
    const data = JSON.parse(probe);
    const videoStream = data.streams.find(s => s.codec_type === 'video');
    if (!videoStream) throw new Error('No video stream found');

    const actualDuration = parseFloat(data.format.duration);
    if (Math.abs(actualDuration - expectedDuration) > 1.0) {
      throw new Error(`Duration mismatch: expected ${expectedDuration}, got ${actualDuration}`);
    }

    // 2. Run ffmpeg signalstats check at 50%
    const midPoint = expectedDuration / 2;
    const stats = await run('ffmpeg', ['-ss', midPoint, '-i', filePath, '-vframes', '1', '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=pipe:1', '-f', 'null', '-']);

    // Parse YMAX from stdout/stderr (metadata print usually goes to stdout)
    const ymaxMatch = stats.match(/lavfi.signalstats.YMAX=([0-9.]+)/);
    const ymax = parseFloat(ymaxMatch[1]);

    if (ymax <= 0) throw new Error(`Video frame at ${midPoint}s is pure black (YMAX=0)`);
    console.log(`   Content verified: Duration=${actualDuration}s, YMAX=${ymax}`);
  }
  ```

#### 4. Test Plan
- **Verification**: Run `npx tsx tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - All existing examples must pass the new stricter verification.
  - Logs should confirm "Content verified: Duration=X, YMAX=Y" for each video.
- **Edge Cases**:
  - `simple-animation`: Ensure the 50% frame (blue box) triggers a high YMAX.
  - `promo-video`: Ensure the particles/background trigger a non-zero YMAX.
