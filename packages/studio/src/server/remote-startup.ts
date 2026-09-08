import { execFile } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { createMcpHttpHandler } from './mcp-http';
import type { StudioPluginOptions } from './types';

export interface RemoteMcpOptions {
  publicUrl: string;
  secretService: string;
  port: number;
}
export function validateRemoteOptions(options: RemoteMcpOptions) {
  const url = new URL(options.publicUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'Remote MCP public URL must be an HTTPS origin with no path, query, or credentials.',
    );
  }
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(options.secretService))
    throw new Error('A dedicated OS secret-store service name is required.');
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535)
    throw new Error('Invalid remote MCP port.');
  return { ...options, publicUrl: url.origin };
}

/** Secret-store stdout stays inside the provider process and is never logged. */
function readSecretService(service: string): Promise<Buffer> {
  const command = process.platform === 'darwin' ? '/usr/bin/security' : 'secret-tool';
  const args =
    process.platform === 'darwin'
      ? ['find-generic-password', '-s', service, '-a', 'helios-mcp', '-w']
      : ['lookup', 'service', service, 'account', 'helios-mcp'];
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { encoding: 'buffer', timeout: 5000, maxBuffer: 4096 },
      (error, stdout) => {
        if (error) {
          stdout?.fill(0);
          reject(new Error('OS secret store unavailable.'));
          return;
        }
        // OS secret-store CLIs append one newline.
        const value = Buffer.from(stdout.toString('utf8').trim());
        stdout.fill(0);
        if (value.length < 32 || value.length > 1024) {
          value.fill(0);
          reject(new Error('Use a dedicated random credential of 32–1024 characters.'));
          return;
        }
        resolve(value);
      },
    );
  });
}
export function createSecretStoreAuthenticator(read: () => Promise<Buffer>) {
  return async (req: IncomingMessage): Promise<string | undefined> => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ') || auth.length > 1031) return;
    let expected: Buffer | undefined;
    const supplied = Buffer.from(auth.slice(7));
    try {
      expected = await read();
      return supplied.length === expected.length && timingSafeEqual(supplied, expected)
        ? 'studio-owner'
        : undefined;
    } catch {
      return undefined;
    } finally {
      supplied.fill(0);
      expected?.fill(0);
    }
  };
}

/** Publish only this authenticated listener through an HTTPS reverse proxy. */
export async function startRemoteMcp(
  getPort: () => number,
  studio: StudioPluginOptions & { projectRoot: string },
  input: RemoteMcpOptions,
) {
  const options = validateRemoteOptions(input);
  const probe = await readSecretService(options.secretService);
  probe.fill(0);
  const handler = createMcpHttpHandler(getPort, {
    ...studio,
    allowedHosts: [new URL(options.publicUrl).hostname],
    allowedOrigins: [options.publicUrl],
    authenticate: createSecretStoreAuthenticator(() => readSecretService(options.secretService)),
  });
  const server = createServer(handler.handle);
  server.requestTimeout = 45000;
  server.headersTimeout = 10000;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(options.port, '127.0.0.1', resolve);
    });
  } catch {
    await handler.close();
    throw new Error('Could not bind the remote MCP listener.');
  }
  return {
    close: async () => {
      await handler.close();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
