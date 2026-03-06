import { bench, describe, beforeAll, vi } from 'vitest';
import { AwsLambdaAdapter } from '../../src/adapters/aws-adapter.js';

vi.mock('@aws-sdk/client-lambda', () => {
  return {
    LambdaClient: vi.fn().mockImplementation(() => {
      return {
        send: vi.fn().mockResolvedValue({
          StatusCode: 200,
          Payload: new TextEncoder().encode(JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({ output: 'Mocked output', exitCode: 0 })
          }))
        })
      };
    }),
    InvokeCommand: class {
      constructor(params: any) {}
    }
  };
});

describe('AwsLambdaAdapter Performance', () => {
  let adapter: AwsLambdaAdapter;

  const mockJob = {
    id: 'job-1',
    type: 'render' as const,
    spec: {
      composition: 'MyComp',
      frames: [0, 100],
      resolution: { width: 1920, height: 1080 },
      fps: 30
    },
    meta: {
      jobDefUrl: 's3://bucket/job.json',
      chunkId: 0
    }
  };

  beforeAll(() => {
    adapter = new AwsLambdaAdapter({
      region: 'us-east-1',
      functionName: 'helios-worker'
    });
  });

  bench('AwsLambdaAdapter.execute - successful invocation', async () => {
    await adapter.execute(mockJob);
  }, {
    time: 500
  });
});
