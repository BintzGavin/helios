---
id: PERF-014
slug: ffmpeg-ultrafast
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-014: Optimize FFmpeg with Ultrafast Preset

## Context & Goal
The Jules microVM environment relies entirely on CPU for all rendering, capture, and encoding tasks. Currently, `DomStrategy` orchestrates the rendering pipeline, but when it passes the output frames to FFmpeg, the FFmpeg encoding step can be extremely CPU intensive. By defaulting to the `ultrafast` preset in FFmpeg for `libx264` encodes, we can significantly reduce the CPU overhead during the encoding phase. This tradeoff prioritizes speed over compression efficiency (resulting in a slightly larger output file), which is perfectly aligned with the goal of achieving the lowest possible DOM render time in a CPU-bound environment.

## File Inventory
- `packages/renderer/src/utils/FFmpegBuilder.ts`

## Implementation Spec

### Step 1: Default to 'ultrafast' preset in FFmpegBuilder
**File**: `packages/renderer/src/utils/FFmpegBuilder.ts`
**What to change**:
In the `getArgs` method, when configuring the video encoding arguments, update the preset configuration.
Currently, the logic pushes the preset argument only if the user explicitly defined `options.preset`.
Modify this logic so that it defines a local variable representing the preset to use. This variable should evaluate to the user-provided `options.preset` if it exists; otherwise, it should default to the string `ultrafast`. Then, unconditionally push the `-preset` flag along with this determined preset value to the `finalArgs` array.

**Why**: Using the `ultrafast` preset instructs `libx264` to skip advanced compression algorithms, vastly reducing CPU cycles required for encoding, which translates directly to faster overall render times in a CPU-bound environment.
**Risk**: Output file sizes will be larger. However, the benchmark strictly measures wall-clock render time, making this a highly favorable tradeoff.

## Test Plan
1. Execute `npx tsx tests/verify-dom-media-attributes.ts` inside the `packages/renderer` directory to ensure the FFmpegBuilder arguments are correctly formed.
