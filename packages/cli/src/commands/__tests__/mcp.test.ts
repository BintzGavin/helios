import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import path from 'path';

const { connect, close, cancelAll, createHeliosMcpServer, StdioServerTransport } = vi.hoisted(() => {
  const connect = vi.fn();
  const close = vi.fn();
  const cancelAll = vi.fn();
  return {
    connect,
    close,
    cancelAll,
    createHeliosMcpServer: vi.fn(() => ({ server: { connect, close }, jobs: { cancelAll }, root: '/root' })),
    StdioServerTransport: vi.fn(function StdioServerTransport() {}),
  };
});

vi.mock('../../mcp/server.js', () => ({ createHeliosMcpServer }));
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({ StdioServerTransport }));

import { registerMcpCommand } from '../mcp.js';

describe('mcp command', () => {
  let program: Command;
  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    dir: console.dir,
  };
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    registerMcpCommand(program);
    connect.mockResolvedValue(undefined);
    close.mockResolvedValue(undefined);
    cancelAll.mockResolvedValue(undefined);
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'once').mockImplementation(() => process);
    vi.spyOn(process.stdin, 'once').mockImplementation(() => process.stdin);
  });

  afterEach(() => {
    Object.assign(console, original);
    vi.restoreAllMocks();
  });

  it('registers `helios mcp` with a --root option', () => {
    const command = program.commands.find((c) => c.name() === 'mcp')!;
    expect(command).toBeDefined();
    expect(command.description()).toBe('Run the Helios MCP server over stdio (for Claude, ChatGPT, Codex and other MCP hosts)');
    expect(command.options.map((o) => o.long)).toEqual(['--root']);
  });

  it('starts the server on stdio for the given root and sends console output to stderr', async () => {
    let logDuringConnect: unknown;
    connect.mockImplementation(async () => {
      console.log('from a library');
      console.info('info');
      console.warn('warn');
      console.debug('debug');
      logDuringConnect = console.log;
    });

    await program.parseAsync(['node', 'helios', 'mcp', '--root', 'videos']);

    expect(createHeliosMcpServer).toHaveBeenCalledWith({ root: path.resolve(process.cwd(), 'videos') });
    expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(vi.mocked(StdioServerTransport).mock.instances[0]);
    expect(logDuringConnect).not.toBe(original.log);
    expect(stdoutWrite).not.toHaveBeenCalled();
    const written = stderrWrite.mock.calls.map((args: unknown[]) => String(args[0])).join('');
    expect(written).toContain('from a library\n');
    expect(written).toContain('info\n');
    expect(written).toContain('warn\n');
    expect(written).toContain('debug\n');
  });

  it('defaults the root to the current directory', async () => {
    await program.parseAsync(['node', 'helios', 'mcp']);
    expect(createHeliosMcpServer).toHaveBeenCalledWith({ root: process.cwd() });
  });

  it('cancels running renders when the host closes stdin', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    await program.parseAsync(['node', 'helios', 'mcp']);
    const onEnd = vi.mocked(process.stdin.once).mock.calls.find(([event]) => event === 'end')![1] as () => Promise<void>;
    await onEnd();
    expect(cancelAll).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits with an error when the server cannot start', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    createHeliosMcpServer.mockImplementationOnce(() => { throw new Error('ENOENT: no such file or directory'); });
    await program.parseAsync(['node', 'helios', 'mcp', '--root', 'missing']);
    expect(exit).toHaveBeenCalledWith(1);
    expect(stdoutWrite).not.toHaveBeenCalled();
  });
});

describe('resolveRoot', () => {
  it('uses --root relative to the working directory', async () => {
    const { resolveRoot } = await import('../mcp.js');
    expect(resolveRoot('videos', '/work', '/home/me')).toBe(path.resolve('/work', 'videos'));
  });

  it('uses the working directory without --root', async () => {
    const { resolveRoot } = await import('../mcp.js');
    expect(resolveRoot(undefined, '/work/project', '/home/me')).toBe(path.resolve('/work/project'));
  });

  it('never makes the filesystem root the project', async () => {
    const { resolveRoot } = await import('../mcp.js');
    expect(resolveRoot(undefined, '/', '/home/me')).toBe(path.join('/home/me', 'Helios'));
  });
});
