import { LocalWorkerAdapter } from '../src/adapters/local-adapter.js';
import type { WorkerJob } from '../src/types/job.js';

async function main() {
  console.log('🚀 LocalWorkerAdapter Standalone Example');
  console.log('========================================\n');

  const adapter = new LocalWorkerAdapter();

  try {
    // ----------------------------------------------------------------------
    // Scenario 1: Standard Execution
    // ----------------------------------------------------------------------
    console.log('--- Scenario 1: Standard Execution ---');
    const standardJob: WorkerJob = {
      command: 'node',
      args: ['-e', 'console.log("Hello from local worker")'],
    };

    console.log(`Executing command: ${standardJob.command} ${standardJob.args?.join(' ')}`);
    const standardResult = await adapter.execute(standardJob);

    console.log('Result:');
    console.log(`  Exit Code: ${standardResult.exitCode}`);
    console.log(`  Duration:  ${standardResult.durationMs}ms`);
    console.log(`  Stdout:    ${standardResult.stdout.trim()}`);
    console.log(`  Stderr:    ${standardResult.stderr.trim()}\n`);

    // ----------------------------------------------------------------------
    // Scenario 2: Log Streaming
    // ----------------------------------------------------------------------
    console.log('--- Scenario 2: Log Streaming ---');
    const streamingJob: WorkerJob = {
      command: 'node',
      args: ['-e', 'setTimeout(() => console.log("Line 1"), 100); setTimeout(() => console.log("Line 2"), 300);'],
      onStdout: (data) => console.log(`[STREAM STDOUT]: ${data.trim()}`),
      onStderr: (data) => console.error(`[STREAM STDERR]: ${data.trim()}`),
    };

    console.log(`Executing command: ${streamingJob.command} ${streamingJob.args?.join(' ')}`);
    const streamingResult = await adapter.execute(streamingJob);

    console.log('Result:');
    console.log(`  Exit Code: ${streamingResult.exitCode}`);
    console.log(`  Duration:  ${streamingResult.durationMs}ms`);
    console.log(`  Final Stdout: ${streamingResult.stdout.replace(/\\n/g, '\\\\n').trim()}\n`);

    // ----------------------------------------------------------------------
    // Scenario 3: Timeout Handling
    // ----------------------------------------------------------------------
    console.log('--- Scenario 3: Timeout Handling ---');
    const timeoutJob: WorkerJob = {
      command: 'node',
      args: ['-e', 'setTimeout(() => console.log("Done"), 2000)'],
      timeout: 500, // 500ms timeout
    };

    console.log(`Executing command: ${timeoutJob.command} ${timeoutJob.args?.join(' ')}`);
    console.log(`Configured Timeout: ${timeoutJob.timeout}ms`);

    try {
      await adapter.execute(timeoutJob);
      console.log('❌ Unexpectedly finished without timeout!');
    } catch (err: any) {
      console.log(`✅ Job cancelled as expected: ${err.message}`);
    }

  } catch (error) {
    console.error('Fatal error during execution:', error);
    process.exit(1);
  }
}

main();
