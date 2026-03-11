import { KubernetesAdapter } from '../src/adapters/kubernetes-adapter.js';
import { WorkerJob } from '../src/types/job.js';

async function run() {
  console.log('Starting KubernetesAdapter example...');

  const adapter = new KubernetesAdapter({
    namespace: 'default',
    image: 'ubuntu:latest',
    pollIntervalMs: 5000,
  });

  const job: WorkerJob = {
    command: 'echo',
    args: ['Hello from Kubernetes!'],
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
