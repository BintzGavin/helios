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

    expect(fetchMock).toHaveBeenCalledWith('http://test.registry/index.json', expect.objectContaining({
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

    expect(fetchMock).toHaveBeenCalledWith('http://test.registry/index.json', expect.objectContaining({
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

  it('should return both framework-specific and vanilla components when filtering', async () => {
    const mockComponents = [
      { name: 'CompReact', type: 'react', files: [] },
      { name: 'CompVanilla', type: 'vanilla', files: [] },
      { name: 'CompVue', type: 'vue', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents('react');

    expect(result).toHaveLength(2);
    expect(result.map(c => c.name)).toContain('CompReact');
    expect(result.map(c => c.name)).toContain('CompVanilla');
    expect(result.map(c => c.name)).not.toContain('CompVue');
  });

  it('should prioritize framework-specific component over vanilla in findComponent', async () => {
    const mockComponents = [
      { name: 'CompDual', type: 'vanilla', files: [] },
      { name: 'CompDual', type: 'react', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.findComponent('CompDual', 'react');

    expect(result).toBeDefined();
    expect(result!.type).toBe('react');
  });

  it('should fallback to vanilla component if framework-specific is missing in findComponent', async () => {
    const mockComponents = [
      { name: 'CompVanilla', type: 'vanilla', files: [] },
      { name: 'CompVue', type: 'vue', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.findComponent('CompVanilla', 'react');

    expect(result).toBeDefined();
    expect(result!.type).toBe('vanilla');
  });

  it('should return undefined if neither framework-specific nor vanilla component exists', async () => {
    const mockComponents = [
      { name: 'CompVue', type: 'vue', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.findComponent('CompVue', 'react');

    expect(result).toBeUndefined();
  });
});
