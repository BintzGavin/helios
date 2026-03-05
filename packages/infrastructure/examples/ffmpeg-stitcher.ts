import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalWorkerAdapter } from '../src/adapters/local-adapter.js';
import { FfmpegStitcher } from '../src/stitcher/ffmpeg-stitcher.js';

async function main() {
  console.log('🎬 Starting FfmpegStitcher Example...\n');

  // 1. Create a temporary directory for our dummy video chunks and the final output
  const tempDir = await mkdtemp(join(tmpdir(), 'helios-stitcher-example-'));
  console.log(`📂 Created temporary directory: ${tempDir}`);

  // We'll use the LocalWorkerAdapter to run the 'ffmpeg' commands to generate dummy videos
  const workerAdapter = new LocalWorkerAdapter();

  try {
    const chunkPaths: string[] = [];
    const numChunks = 3;

    // 2. Generate dummy video chunks using ffmpeg
    console.log(`\n⏳ Generating ${numChunks} dummy video chunks...`);
    for (let i = 0; i < numChunks; i++) {
      const chunkPath = join(tempDir, `chunk_${i}.mp4`);
      console.log(`   - Generating chunk ${i} (${chunkPath})...`);

      // Generate a 1-second video showing a test pattern and a varying color background
      // Note: We use yuv420p to ensure broad compatibility
      const result = await workerAdapter.execute({
        command: 'ffmpeg',
        args: [
          '-f', 'lavfi',
          '-i', `testsrc=duration=1:size=320x240:rate=30`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-y',
          chunkPath
        ]
      });

      if (result.exitCode !== 0) {
        throw new Error(`Failed to generate chunk ${i}: ${result.stderr}`);
      }

      chunkPaths.push(chunkPath);
    }

    console.log('✅ Dummy video chunks generated successfully.');

    // 3. Instantiate the FfmpegStitcher
    console.log('\n🧵 Stitching chunks together using FfmpegStitcher...');
    // We pass the workerAdapter so it can execute the ffmpeg stitch command locally
    const stitcher = new FfmpegStitcher(workerAdapter);

    // The final stitched output file
    const outputPath = join(tempDir, 'final_stitched_output.mp4');

    // 4. Call stitch() with the generated chunk files
    const startTime = Date.now();
    await stitcher.stitch(chunkPaths, outputPath);
    const durationMs = Date.now() - startTime;

    // 5. Assert the output file exists
    const fileStats = await stat(outputPath);
    if (!fileStats.isFile() || fileStats.size === 0) {
        throw new Error('Stitching failed: Output file does not exist or is empty.');
    }

    console.log(`✅ Stitching completed successfully in ${durationMs}ms!`);
    console.log(`🎥 Final output video: ${outputPath}`);
    console.log(`   Size: ${(fileStats.size / 1024).toFixed(2)} KB`);
    console.log('\n✨ FfmpegStitcher effectively concatenated the segments without re-encoding, leading to very fast merge times compared to standard rendering.');

  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exitCode = 1;
  } finally {
    // 6. Clean up temporary files
    console.log('\n🧹 Cleaning up temporary directory...');
    try {
      await rm(tempDir, { recursive: true, force: true });
      console.log('✅ Cleanup complete.');
    } catch (cleanupError) {
      console.error(`❌ Failed to clean up temporary directory ${tempDir}:`, cleanupError);
    }
  }
}

// Run the example
main().catch(console.error);
