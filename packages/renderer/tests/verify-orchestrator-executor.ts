import { RenderOrchestrator, DistributedRenderOptions, RendererOptions, RenderJobOptions, RenderExecutor } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

class MockExecutor implements RenderExecutor {
  public callCount = 0;
  public renderedFiles: string[] = [];

  async render(compositionUrl: string, outputPath: string, options: RendererOptions, jobOptions?: RenderJobOptions): Promise<void> {
    this.callCount++;
    this.renderedFiles.push(outputPath);
    console.log(`MockExecutor: Rendering chunk to ${outputPath}`);

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create a dummy file so cleanup logic doesn't complain too much
    // content is not valid video, so concat will fail
    await fs.promises.writeFile(outputPath, 'dummy content');
  }
}

async function run() {
  console.log('Starting Verify Orchestrator Executor...');

  const executor = new MockExecutor();
  const options: DistributedRenderOptions = {
    width: 100,
    height: 100,
    fps: 30,
    durationInSeconds: 1,
    concurrency: 4,
    executor: executor,
    // We provide a dummy ffmpeg path. Concatenation will attempt to use it and fail.
    // This is expected since we don't want to actually run ffmpeg on dummy files.
    ffmpegPath: 'dummy-ffmpeg'
  };

  const outputPath = 'test-output.mp4';

  try {
    await RenderOrchestrator.render('http://localhost:3000', outputPath, options);
  } catch (e: any) {
    // We expect failure at the concatenation step or mixing step
    // because our dummy files are not valid video files and ffmpeg binary is dummy.
    console.log('Caught expected error during pipeline completion:', e.message);
  }

  // Verify
  if (executor.callCount !== 4) {
    console.error(`❌ Expected 4 calls to executor, got ${executor.callCount}`);
    process.exit(1);
  }

  console.log(`✅ MockExecutor was called ${executor.callCount} times as expected.`);
  console.log('✅ Verify Orchestrator Executor: Passed');
}

run().catch(e => {
  console.error('❌ Test Failed:', e);
  process.exit(1);
});
