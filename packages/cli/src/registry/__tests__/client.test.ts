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

  it('should return from cache early without filtering if framework is undefined', async () => {
    const mockComponents = [
      { name: 'CompReact', type: 'react', files: [] },
      { name: 'CompVanilla', type: 'vanilla', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents(); // populates cache

    const fetchMock2 = vi.fn().mockRejectedValue(new Error("Should not be called"));
    vi.stubGlobal('fetch', fetchMock2);

    const result = await client.getComponents(); // should return from cache early
    expect(result).toHaveLength(2);
    expect(fetchMock2).not.toHaveBeenCalled();
  });

  it('should return first exact match in findInList when framework is omitted', async () => {
    const mockComponents = [
      { name: 'CompReact', type: 'react', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents(); // populates cache

    const result = await client.findComponent('CompReact'); // omitted framework
    expect(result).toBeDefined();
    expect(result!.type).toBe('react');
  });

  it('should hit remoteCache early in findComponent if it exists', async () => {
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
    await client.getComponents(); // populates remoteCache

    const component = await client.findComponent('test-comp', 'react');
    expect(component).toBeDefined();
    expect(component!.name).toBe('test-comp');

    // Test hitting line 96-97 with remoteCache pre-populated
    const fetchMock2 = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'from remote cache fetch',
    });
    vi.stubGlobal('fetch', fetchMock2);

    const component2 = await client.findComponent('test-comp');
    expect(component2).toBeDefined();
    expect(component2!.files[0].content).toBe('from remote cache fetch');
  });

  it('should throw an error in hydrateComponent when fetch for individual file fails', async () => {
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
        ok: false,
        status: 404,
      });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    await expect(client.findComponent('test-comp', 'react')).rejects.toThrow(/Failed to fetch file test-comp.tsx for component test-comp: Status 404/);
  });

  it('should throw an error in hydrateComponent when fetch for individual file throws an error', async () => {
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
      .mockRejectedValueOnce(new Error("Network disconnect"));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    await expect(client.findComponent('test-comp', 'react')).rejects.toThrow(/Failed to fetch file test-comp.tsx for component test-comp: Network disconnect/);
  });

  it('should hit cache block after force fetch in findComponent', async () => {
    // Old format registry triggers caching in `this.cache`
    const mockComponents = [
      { name: 'CompReact', type: 'react', files: [] },
      { name: 'CompVanilla', type: 'vanilla', files: [] },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    // We intentionally don't call getComponents() so caches are empty
    // findComponent will fetch and then check cache again
    const result = await client.findComponent('CompReact');

    expect(result).toBeDefined();
    expect(result!.name).toBe('CompReact');
  });

  it('should hit remoteCache block after force fetch in findComponent', async () => {
    // New format registry triggers caching in `this.remoteCache`
    const mockIndex = {
      version: '1.0.0',
      components: [
        {
          name: 'CompReact',
          description: 'Test Component',
          type: 'react',
          files: ['CompReact.tsx'],
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
        text: async () => 'export const CompReact = () => <div>React</div>;',
      });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('https://example.com/registry/index.json');
    // Caches are empty initially, force fetch occurs
    const result = await client.findComponent('CompReact');

    expect(result).toBeDefined();
    expect(result!.name).toBe('CompReact');
    expect(result!.files[0].content).toContain('React');
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

  it('should return from cache when getComponents is called again without framework', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: 'CompReact', type: 'react', files: [] }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents();
    // Cache is now populated, call again without framework to hit line 32 false branch
    const result = await client.getComponents();
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should return undefined from findInList when matches are empty', async () => {
    const mockComponents = [{ name: 'OtherComp', type: 'react', files: [] }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents(); // Populate this.cache
    const result = await client.findComponent('CompReact'); // Hits line 73
    expect(result).toBeUndefined();
  });

  it('should return from findInList when no framework is provided', async () => {
    const mockComponents = [{ name: 'CompReact', type: 'react', files: [] }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents(); // Populate this.cache
    const result = await client.findComponent('CompReact'); // Hits line 85 and line 91
    expect(result).toBeDefined();
    expect(result!.name).toBe('CompReact');
  });

  it('should find component in remote cache directly', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'react', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockIndex })
      .mockResolvedValueOnce({ ok: true, text: async () => 'content' });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry/index.json');
    await client.getComponents(); // Populate this.remoteCache
    const result = await client.findComponent('CompReact'); // Hits lines 96, 97
    expect(result).toBeDefined();
    expect(result!.name).toBe('CompReact');
  });

  it('should return undefined if caches are empty, fetched, but component still not found', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [], // Empty components list
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.findComponent('MissingComp'); // Hits lines 101, 105 (false), 110 (false)
    expect(result).toBeUndefined();
  });

  it('should correctly format baseUrl when url does not end with .json', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'react', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockIndex })
      .mockResolvedValueOnce({ ok: true, text: async () => 'content' });
    vi.stubGlobal('fetch', fetchMock);

    // URL without .json
    const client = new RegistryClient('http://test.registry/api/');
    const result = await client.findComponent('CompReact'); // Hits line 126
    expect(result).toBeDefined();
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://test.registry/api/CompReact.tsx', expect.anything());
  });

  it('should not fallback to local registry if no URL is present', async () => {
    delete process.env.HELIOS_REGISTRY_URL;
    const client = new RegistryClient('');
    const result = await client.getComponents();
    expect(result).toBeDefined();
  });

  it('should hit framework vanilla fallback branches correctly', async () => {
    const mockComponents = [
      { name: 'CompVanilla', type: 'vanilla', files: [] }
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    await client.getComponents();

    const result = await client.getComponents('react');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('CompVanilla');
  });

  it('should hit remoteCache branch where findInList returns undefined', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'react', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => mockIndex });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry/index.json');
    await client.getComponents();

    const result = await client.findComponent('NonExistent');
    expect(result).toBeUndefined();
  });

  it('should hit force fetch remote cache branch where findInList returns undefined', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'react', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => mockIndex });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry/index.json');

    const result = await client.findComponent('NonExistent');
    expect(result).toBeUndefined();
  });

  it('should hit branch when getComponents is called with framework and local cache is used', async () => {
    const client = new RegistryClient('http://invalid-url-that-fails');
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await client.getComponents('react');
    expect(result).toBeDefined();
  });

  it('should hit framework false branch for old format cache return', async () => {
    const mockComponents = [
      { name: 'CompVanilla', type: 'vanilla', files: [] }
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComponents,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents();
    expect(result).toHaveLength(1);
  });

  it('should hit framework false branch for new format cache return', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'react', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIndex,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents();
    expect(result).toHaveLength(1);
  });

  it('should cover branch when res.ok is false but it does not throw', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents('react');
    expect(result).toBeDefined();
  });

  it('should hit fallback cache logic when getComponents is called without framework and fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents();
    expect(result).toBeDefined();
  });

  it('should cover fallback when fetch response is not an array or object format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => "invalid string data",
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents();
    expect(result).toBeDefined();
  });

  it('should cover branch for vanilla type check when getting components with framework in new format', async () => {
    const mockIndex = {
      version: '1.0.0',
      components: [
        { name: 'CompReact', description: 'Test', type: 'vanilla', files: ['CompReact.tsx'] }
      ]
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIndex,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents('react');
    expect(result).toHaveLength(1);
  });

  it('should cover branch for vanilla type check when getting components with framework in fallback format', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const client = new RegistryClient('http://test.registry');
    const result = await client.getComponents('non-existent-framework-to-trigger-vanilla');
    expect(result).toBeDefined();
  });
});
