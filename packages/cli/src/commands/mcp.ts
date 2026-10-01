import { Command } from 'commander';
import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createHeliosMcpServer } from '../mcp/server.js';

/**
 * In stdio mode stdout carries only the MCP protocol, so everything that logs to stdout
 * (console.log/info/debug and friends) goes to stderr instead.
 */
export function redirectConsoleToStderr(): void {
  const toStderr = (...args: unknown[]) => {
    process.stderr.write(`${util.format(...args)}\n`);
  };
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
  console.warn = toStderr;
  console.dir = (item: unknown, options?: util.InspectOptions) => {
    process.stderr.write(`${util.inspect(item, options)}\n`);
  };
}

/**
 * The project folder. Desktop hosts such as Claude Desktop start servers in the filesystem
 * root, which must never become the project, so without --root that case uses ~/Helios.
 */
export function resolveRoot(rootOption: string | undefined, cwd: string, home: string): string {
  if (rootOption) return path.resolve(cwd, rootOption);
  const resolved = path.resolve(cwd);
  if (resolved === path.parse(resolved).root) return path.join(home, 'Helios');
  return resolved;
}

export function registerMcpCommand(program: Command) {
  program
    .command('mcp')
    .description('Run the Helios MCP server over stdio (for Claude, ChatGPT, Codex and other MCP hosts)')
    .option('--root <dir>', 'Project folder the tools may read and write (default: the current directory)')
    .action(async (options) => {
      redirectConsoleToStderr();
      try {
        const root = resolveRoot(options.root, process.cwd(), os.homedir());
        fs.mkdirSync(root, { recursive: true });
        const { server, jobs } = createHeliosMcpServer({ root });
        const transport = new StdioServerTransport();

        let closing = false;
        const shutdown = async () => {
          if (closing) return;
          closing = true;
          // Renders are child processes; don't leave them running once the host is gone.
          await jobs.cancelAll();
          await server.close().catch(() => {});
          process.exit(0);
        };
        process.stdin.once('end', shutdown);
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);

        await server.connect(transport);
        console.error(`Helios MCP server running on stdio (root: ${root})`);
      } catch (err: any) {
        console.error('MCP server failed:', err.message);
        process.exit(1);
      }
    });
}
