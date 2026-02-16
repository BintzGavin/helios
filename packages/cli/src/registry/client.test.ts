import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistryClient } from './client.js';
import { ComponentDefinition, RemoteRegistryIndex } from './types.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RegistryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockIndex: RemoteRegistryIndex = {
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

  it('should fetch remote registry index', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndex,
    });

    const client = new RegistryClient('https://example.com/registry/index.json');
    const components = await client.getComponents('react');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/registry/index.json', expect.anything());
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe('test-comp');
    expect(components[0].files).toHaveLength(0); // Should be empty/partial
  });

  it('should hydrate component on findComponent', async () => {
    // 1. Fetch index
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndex,
    });

    const client = new RegistryClient('https://example.com/registry/index.json');

    // 2. Hydrate file fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'export const Test = () => <div>Test</div>;',
    });

    const component = await client.findComponent('test-comp', 'react');

    expect(component).toBeDefined();
    expect(component!.name).toBe('test-comp');
    expect(component!.files).toHaveLength(1);
    expect(component!.files[0].content).toContain('<div>Test</div>');

    // Check file URL
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/registry/test-comp.tsx', expect.anything());
  });

  it('should fallback to local registry if fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const client = new RegistryClient('https://example.com/registry/index.json');
    const components = await client.getComponents('react');

    // Should return local components (e.g. use-video-frame)
    expect(components.length).toBeGreaterThan(0);
    expect(components.find(c => c.name === 'use-video-frame')).toBeDefined();
  });
});
