import { FlyMachinesAdapter } from '../src/adapters/fly-machines-adapter.js';

async function main() {
  const adapter = new FlyMachinesAdapter({
    apiToken: process.env.FLY_API_TOKEN || 'dummy-token',
    appName: 'my-helios-app',
    imageRef: 'registry.fly.io/my-helios-app:latest',
  });

  console.log('Executing job on Fly Machine...');

  try {
    const result = await adapter.execute({
      command: 'node',
      meta: {
        jobDefUrl: 'https://storage.googleapis.com/my-bucket/job.json',
        chunkIndex: 0,
      },
    });

    console.log('Execution finished with exit code:', result.exitCode);
  } catch (err) {
    console.error('Execution failed:', err);
  }
}

main().catch(console.error);
