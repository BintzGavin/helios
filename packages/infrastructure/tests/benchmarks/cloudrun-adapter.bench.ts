import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
import { CloudRunAdapter } from '../../src/adapters/cloudrun-adapter.js';

// Define the mock implementation for GoogleAuth
const mockRequest = vi.fn();

// Mock google-auth-library
vi.mock('google-auth-library', () => {
  return {
    GoogleAuth: class {
      async getIdTokenClient() {
        return {
          request: mockRequest
        };
      }
    }
  };
});

describe('CloudRunAdapter Performance', () => {
  let adapter: CloudRunAdapter;

  beforeAll(() => {
    // Default successful behavior for request
    mockRequest.mockResolvedValue({
      status: 200,
      data: {
        exitCode: 0,
        stdout: 'Mocked output',
        stderr: ''
      }
    });

    adapter = new CloudRunAdapter({
      serviceUrl: 'https://mocked-cloud-run-service.run.app',
      jobDefUrl: 'gcs://my-bucket/job.json'
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  bench('execute (mocked successful invocation)', async () => {
    await adapter.execute({
      command: 'ignored',
      args: [],
      cwd: '/tmp',
      env: {},
      meta: { chunkId: 1 }
    });
  });
});
