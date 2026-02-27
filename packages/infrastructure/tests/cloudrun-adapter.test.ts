import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudRunAdapter } from '../src/adapters/cloudrun-adapter.js';

// Mock google-auth-library
const mockRequest = vi.fn();
const mockGetIdTokenClient = vi.fn();

// The class mock needs to return an object when instantiated with 'new'
const MockGoogleAuth = vi.fn().mockImplementation(() => {
  return {
    getIdTokenClient: mockGetIdTokenClient
  };
});

vi.mock('google-auth-library', () => {
  return {
    GoogleAuth: MockGoogleAuth
  };
});

describe('CloudRunAdapter', () => {
  const serviceUrl = 'https://my-service-url.run.app';
  const jobDefUrl = 'https://storage.googleapis.com/bucket/job.json';

  beforeEach(() => {
    // Reset mocks
    mockGetIdTokenClient.mockReset();
    mockRequest.mockReset();
    MockGoogleAuth.mockClear();

    // Default successful behavior
    mockGetIdTokenClient.mockResolvedValue({
      request: mockRequest
    });
    mockRequest.mockResolvedValue({
      status: 200,
      data: {
        exitCode: 0,
        stdout: 'Render success',
        stderr: ''
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully invoke Cloud Run service', async () => {
    const adapter = new CloudRunAdapter({ serviceUrl, jobDefUrl });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 1 }
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Render success');

    // Verify client acquisition
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(serviceUrl);

    // Verify request payload
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: serviceUrl,
      method: 'POST',
      data: {
        jobPath: jobDefUrl,
        chunkIndex: 1
      }
    }));
  });

  it('should use jobDefUrl from meta if not in config', async () => {
    const adapter = new CloudRunAdapter({ serviceUrl });

    await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 2, jobDefUrl: 'https://override.url/job.json' }
    });

    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        jobPath: 'https://override.url/job.json',
        chunkIndex: 2
      })
    }));
  });

  it('should return error if jobDefUrl is missing', async () => {
    const adapter = new CloudRunAdapter({ serviceUrl });

    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 3 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('requires jobDefUrl');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('should handle non-200 HTTP response', async () => {
    mockRequest.mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
      data: {
        stderr: 'Service crashed'
      }
    });

    const adapter = new CloudRunAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 4 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Service crashed');
  });

  it('should handle request exception (network error)', async () => {
    mockRequest.mockRejectedValue(new Error('Network timeout'));

    const adapter = new CloudRunAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({
      command: 'ignored',
      meta: { chunkId: 5 }
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Cloud Run execution failed: Network timeout');
  });

  it('should handle axios-style error response', async () => {
     const error: any = new Error('Request failed');
     error.response = {
       status: 403,
       statusText: 'Forbidden',
       data: { error: 'Access Denied' }
     };
     mockRequest.mockRejectedValue(error);

     const adapter = new CloudRunAdapter({ serviceUrl, jobDefUrl });
     const result = await adapter.execute({
       command: 'ignored',
       meta: { chunkId: 6 }
     });

     expect(result.exitCode).toBe(1);
     expect(result.stderr).toContain('HTTP 403');
  });
});
