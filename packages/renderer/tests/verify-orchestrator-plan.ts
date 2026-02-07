
import { RenderOrchestrator } from '../src/Orchestrator.js';
import { DistributedRenderOptions } from '../src/Orchestrator.js';
import * as path from 'path';

async function main() {
  console.log('Verifying RenderOrchestrator.plan()...');

  const compositionUrl = 'http://localhost:3000/composition.html';
  const outputPath = path.resolve('output.mp4');
  const options: DistributedRenderOptions = {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInSeconds: 10,
    concurrency: 4,
    videoCodec: 'libx264'
  };

  const plan = RenderOrchestrator.plan(compositionUrl, outputPath, options);

  // Verify Total Frames
  if (plan.totalFrames !== 300) {
    throw new Error(`Expected totalFrames to be 300, got ${plan.totalFrames}`);
  }

  // Verify Chunks
  if (plan.chunks.length !== 4) {
    throw new Error(`Expected 4 chunks, got ${plan.chunks.length}`);
  }

  // Verify Chunk Details
  const chunkSize = Math.ceil(300 / 4); // 75
  let previousEnd = 0;

  for (let i = 0; i < plan.chunks.length; i++) {
    const chunk = plan.chunks[i];

    // Check ID
    if (chunk.id !== i) {
      throw new Error(`Chunk ${i}: Expected id ${i}, got ${chunk.id}`);
    }

    // Check Start Frame
    if (chunk.startFrame !== previousEnd) {
      throw new Error(`Chunk ${i}: Expected startFrame ${previousEnd}, got ${chunk.startFrame}`);
    }

    // Check Frame Count
    const expectedCount = Math.min(chunkSize, 300 - previousEnd);
    if (chunk.frameCount !== expectedCount) {
      throw new Error(`Chunk ${i}: Expected frameCount ${expectedCount}, got ${chunk.frameCount}`);
    }

    previousEnd += chunk.frameCount;

    // Check Output File
    if (!chunk.outputFile.includes(`_part_${i}.mov`)) {
      throw new Error(`Chunk ${i}: Output file format incorrect: ${chunk.outputFile}`);
    }

    // Check Options
    if (chunk.options.audioCodec !== 'pcm_s16le') {
      throw new Error(`Chunk ${i}: Expected audioCodec 'pcm_s16le', got ${chunk.options.audioCodec}`);
    }

    if (chunk.options.audioTracks && chunk.options.audioTracks.length > 0) {
      throw new Error(`Chunk ${i}: Expected audioTracks to be empty`);
    }

    if (chunk.options.videoCodec !== 'libx264') { // Should inherit from base options or defaults?
        // In the implementation:
        // const chunkBaseOptions = { ...options, ... }
        // options has videoCodec: 'libx264'
        // So chunkOptions should have it too.
        if (chunk.options.videoCodec !== 'libx264') {
             throw new Error(`Chunk ${i}: Expected videoCodec 'libx264', got ${chunk.options.videoCodec}`);
        }
    }
  }

  // Verify Mix Options
  if (plan.mixOptions.videoCodec !== 'copy') {
    throw new Error(`Expected mixOptions.videoCodec to be 'copy', got ${plan.mixOptions.videoCodec}`);
  }

  if (plan.mixOptions.mixInputAudio !== true) {
      throw new Error(`Expected mixOptions.mixInputAudio to be true, got ${plan.mixOptions.mixInputAudio}`);
  }

  // Verify Cleanup Files
  if (plan.cleanupFiles.length !== 5) { // 4 chunks + 1 concat target
    throw new Error(`Expected 5 cleanup files, got ${plan.cleanupFiles.length}`);
  }

  console.log('✅ RenderOrchestrator.plan() verified successfully.');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
