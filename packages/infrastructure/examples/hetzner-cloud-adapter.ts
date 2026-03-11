import { HetznerCloudAdapter } from '../src/adapters/hetzner-cloud-adapter.js';

async function main() {
  const apiToken = process.env.HETZNER_API_TOKEN;

  if (!apiToken) {
    console.warn('Skipping Hetzner Cloud example: HETZNER_API_TOKEN not set.');
    return;
  }

  const adapter = new HetznerCloudAdapter({
    apiToken,
    serverType: 'cx11',
    image: 'ubuntu-20.04',
    pollIntervalMs: 5000,
  });

  const job = {
    command: 'npm',
    args: ['run', 'render'],
    onStdout: (msg: string) => process.stdout.write(`[STDOUT] ${msg}`),
    onStderr: (msg: string) => process.stderr.write(`[STDERR] ${msg}`),
  };

  console.log('Executing job on Hetzner Cloud...');
  const result = await adapter.execute(job);

  console.log('\n--- Execution Result ---');
  console.log(`Exit Code: ${result.exitCode}`);
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Stdout: ${result.stdout}`);
  console.log(`Stderr: ${result.stderr}`);
}

main().catch(console.error);
