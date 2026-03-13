import { ModalAdapter } from '../src/adapters/modal-adapter.js';
import { WorkerJob } from '../src/types/job.js';

async function run() {
  console.log('Starting ModalAdapter example...');

  const adapter = new ModalAdapter({
    endpointUrl: process.env.MODAL_ENDPOINT_URL || 'https://my-modal-app.modal.run',
    authToken: process.env.MODAL_AUTH_TOKEN,
  });

  const job: WorkerJob = {
    command: 'echo',
    args: ['Hello from Modal!'],
    meta: { chunkId: 'test-chunk' },
    onStdout: (data) => console.log(`[STDOUT] ${data}`),
    onStderr: (data) => console.log(`[STDERR] ${data}`),
  };

  console.log('Executing job...');
  try {
    const result = await adapter.execute(job);
    console.log('Execution completed:', result);
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

run();
