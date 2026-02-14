import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistryClient } from '../client';

describe('RegistryClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('should use token provided in constructor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry', 'test-token');
    await client.getComponents();

    expect(fetchMock).toHaveBeenCalledWith('http://test.registry', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token',
      }),
    }));
  });

  it('should use token from environment variable', async () => {
    process.env.HELIOS_REGISTRY_TOKEN = 'env-token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents();

    expect(fetchMock).toHaveBeenCalledWith('http://test.registry', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer env-token',
      }),
    }));
  });

  it('should not send authorization header if no token is present', async () => {
    delete process.env.HELIOS_REGISTRY_TOKEN;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents();

    const calls = fetchMock.mock.calls;
    const options = calls[0][1];
    expect(options.headers).toEqual({});
  });
});
