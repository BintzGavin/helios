const fs = require('fs');

const planContent = `---
id: PERF-481
slug: optimize-ffmpeg-threads
status: unclaimed
claimed_by: ""
created: 2026-05-11
completed: ""
result: ""
---

# PERF-481: Optimize FFmpeg Threading Arguments

## Focus Area
\`DomStrategy.getFFmpegArgs\` video input arguments.

## Background Research
Currently, the DOM renderer passes frames to FFmpeg via stdin using \`image2pipe\` or \`mjpeg\`.
The current video input arguments in \`DomStrategy.ts\` are:
\`\`\`typescript
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', \`\${options.fps}\`,
      '-thread_queue_size', '512',
      '-i', '-',
    ];
\`\`\`

When piping thousands of frames rapidly, FFmpeg needs to keep up. While \`-thread_queue_size 512\` helps buffer frames on the input side to avoid blocking the Node.js pipe, adding explicit threading options to the *decoding* phase of the input can speed up ingestion, especially for compressed formats like WebP or JPEG.
Additionally, FFmpeg supports the \`-threads\` flag on the input stream to allocate more cores to decode the incoming image data before it hits the filter graph/encoder.

By increasing \`-thread_queue_size\` to \`1024\` and adding \`-threads 0\` (auto-detect core count) to the input arguments, we may reduce the time Node.js spends blocked on pipe backpressure.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.13s
- **Bottleneck analysis**: Occasional FFmpeg pipe backpressure when the renderer loops outpace FFmpeg's ability to decode incoming WebP/JPEG frames.

## Implementation Spec

### Step 1: Add input threading arguments
**File**: \`packages/renderer/src/strategies/DomStrategy.ts\`
**What to change**:
Update the \`videoInputArgs\` array to include threading optimizations.
\`\`\`typescript
<<<<<<< SEARCH
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', \`\${options.fps}\`,
      '-thread_queue_size', '512',
      '-i', '-',
    ];
=======
    const videoInputArgs = [
      '-f', inputFormat,
      ...(format === 'webp' ? ['-vcodec', 'webp'] : []),
      '-framerate', \`\${options.fps}\`,
      '-threads', '0',
      '-thread_queue_size', '1024',
      '-i', '-',
    ];
>>>>>>> REPLACE
\`\`\`
**Why**: \`-threads 0\` tells FFmpeg to use all available cores for decoding the input stream (WebP/JPEG decoding), which is CPU-intensive. Increasing the queue size to \`1024\` provides a larger buffer for the fast-producing Node.js process.
**Risk**: Very low. At worst, it has no effect if decoding is already fast enough or if the FFmpeg build doesn't support multithreaded decoding for the specific image codec.

## Correctness Check
Run the benchmark and ensure the video renders successfully without corrupted frames or "queue too small" warnings from FFmpeg.
`;

fs.writeFileSync('.sys/plans/PERF-481-optimize-ffmpeg-threads.md', planContent);
console.log("Plan created.");
