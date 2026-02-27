import { describe, it, expect, vi } from 'vitest';
import { createMcpServer } from './mcp';
import { StudioPluginOptions } from './types';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    resources: Record<string, any> = {};
    tools: Record<string, any> = {};
    constructor(public options: any) {}
    resource(name: string, uri: string, handler: any) {
      this.resources[name] = { uri, handler };
    }
    tool(name: string, schema: any, handler: any) {
      this.tools[name] = { schema, handler };
    }
  }
}));

vi.mock('./discovery', () => ({
  findCompositions: vi.fn().mockResolvedValue([]),
  createComposition: vi.fn(),
  findAssets: vi.fn().mockResolvedValue([])
}));

vi.mock('./render-manager', () => ({
  startRender: vi.fn()
}));

vi.mock('./documentation', () => ({
  findDocumentation: vi.fn().mockReturnValue([])
}));

import { findDocumentation } from './documentation';
import { findAssets, createComposition, findCompositions } from './discovery';
import { startRender } from './render-manager';

describe('createMcpServer', () => {
  const getPort = () => 1234;

  it('should register resources and tools', () => {
    const server = createMcpServer(getPort) as any;

    expect(server.resources).toHaveProperty('documentation');
    expect(server.resources).toHaveProperty('assets');
    expect(server.resources).toHaveProperty('components');
    expect(server.resources).toHaveProperty('compositions');

    expect(server.tools).toHaveProperty('create_composition');
    expect(server.tools).toHaveProperty('render_composition');
    expect(server.tools).toHaveProperty('install_component');
    expect(server.tools).toHaveProperty('uninstall_component');
    expect(server.tools).toHaveProperty('update_component');
  });

  it('should handle documentation resource', async () => {
    const server = createMcpServer(getPort) as any;
    (findDocumentation as any).mockReturnValue([{ id: 'test', content: 'content' }]);

    const handler = server.resources['documentation'].handler;
    const result = await handler({ href: 'helios://documentation' });

    expect(findDocumentation).toHaveBeenCalled();
    expect(JSON.parse(result.contents[0].text)).toEqual([{ id: 'test', content: 'content' }]);
  });

  it('should handle assets resource', async () => {
    const server = createMcpServer(getPort) as any;
    (findAssets as any).mockResolvedValue([{ id: 'asset1' }]);

    const handler = server.resources['assets'].handler;
    const result = await handler({ href: 'helios://assets' });

    expect(findAssets).toHaveBeenCalled();
    expect(JSON.parse(result.contents[0].text)).toEqual([{ id: 'asset1' }]);
  });

  it('should handle create_composition tool with defaultProps', async () => {
    const server = createMcpServer(getPort) as any;
    (createComposition as any).mockReturnValue({ id: 'test', name: 'Test' });

    const handler = server.tools['create_composition'].handler;
    const result = await handler({
      name: 'test-comp',
      defaultProps: { text: 'Hello' }
    });

    expect(createComposition).toHaveBeenCalledWith(
      expect.any(String),
      'test-comp',
      'vanilla',
      expect.objectContaining({
        defaultProps: { text: 'Hello' }
      })
    );
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 'test', name: 'Test' });
  });

  it('should handle render_composition tool with inputProps', async () => {
    const server = createMcpServer(getPort) as any;
    (findCompositions as any).mockResolvedValue([{ id: 'comp-1', url: '/@fs/path/to/comp' }]);
    (startRender as any).mockResolvedValue('job-123');

    const handler = server.tools['render_composition'].handler;
    const result = await handler({
      compositionId: 'comp-1',
      inputProps: { text: 'Hello' }
    });

    expect(startRender).toHaveBeenCalledWith(
      expect.objectContaining({
        compositionUrl: '/@fs/path/to/comp',
        inputProps: { text: 'Hello' }
      }),
      1234
    );
    expect(JSON.parse(result.content[0].text)).toEqual({ jobId: 'job-123', status: 'queued' });
  });

  it('should handle components resource', async () => {
    const components = [{ name: 'comp1', type: 'ui', files: [] }];
    const options: StudioPluginOptions = {
      components,
      onCheckInstalled: vi.fn().mockResolvedValue(true)
    };

    const server = createMcpServer(getPort, options) as any;
    const handler = server.resources['components'].handler;
    const result = await handler({ href: 'helios://components' });

    expect(options.onCheckInstalled).toHaveBeenCalledWith('comp1');
    expect(JSON.parse(result.contents[0].text)).toEqual([{ ...components[0], installed: true }]);
  });

  it('should handle install_component tool', async () => {
    const onInstallComponent = vi.fn().mockResolvedValue(undefined);
    const options: StudioPluginOptions = { onInstallComponent };

    const server = createMcpServer(getPort, options) as any;
    const handler = server.tools['install_component'].handler;
    const result = await handler({ name: 'comp1' });

    expect(onInstallComponent).toHaveBeenCalledWith('comp1');
    expect(result.content[0].text).toContain('Installed comp1');
  });

  it('should return error if install_component not supported', async () => {
    const server = createMcpServer(getPort, {}) as any;
    const handler = server.tools['install_component'].handler;
    const result = await handler({ name: 'comp1' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Feature not available');
  });
});
