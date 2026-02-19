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

  it('should fetch remote registry index', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        {
          name: 'test-comp',
          description: 'Test Component',
          type: 'react',
          files: ['test-comp.tsx'],
          dependencies: { react: '18' }
        }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIndex,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    const components = await client.getComponents('react');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/registry/index.json', expect.anything());
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe('test-comp');
    expect(components[0].files).toHaveLength(0); // Should be empty/partial
  });

  it('should hydrate component on findComponent', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        {
          name: 'test-comp',
          description: 'Test Component',
          type: 'react',
          files: ['test-comp.tsx'],
          dependencies: { react: '18' }
        }
      ]
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'export const Test = () => <div>Test</div>;',
      });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    const component = await client.findComponent('test-comp', 'react');

    expect(component).toBeDefined();
    expect(component!.name).toBe('test-comp');
    expect(component!.files).toHaveLength(1);
    expect(component!.files[0].content).toContain('<div>Test</div>');
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/registry/test-comp.tsx', expect.anything());
  });

  it('should fallback to local registry if fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    const components = await client.getComponents('react');

    expect(components.length).toBeGreaterThan(0);
    expect(components.find(c => c.name === 'use-video-frame')).toBeDefined();
  });
});
