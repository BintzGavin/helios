import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

export interface CliExit {
  code: number | null;
  signal: NodeJS.Signals | null;
  /** Set when the process could not be started at all. */
  error?: Error;
}

export interface CliChild {
  /** Resolves once the process has exited (never rejects). */
  exited: Promise<CliExit>;
  kill(signal?: NodeJS.Signals): void;
}

export interface CliSpawnOptions {
  cwd: string;
  onStdout?(text: string): void;
  onStderr?(text: string): void;
}

/** Starts `helios <args>`; the MCP tools only ever reach the CLI through this. */
export type CliRunner = (args: string[], options: CliSpawnOptions) => CliChild;

/** packages/cli/bin/helios.js, from both dist/mcp/*.js and src/mcp/*.ts. */
export function defaultCliBin(): string {
  return fileURLToPath(new URL('../../bin/helios.js', import.meta.url));
}

/**
 * Runs the CLI as `node <bin> <args>` with no shell. Its stdout and stderr go to the callbacks,
 * never to this process's stdout, which carries the MCP protocol.
 */
export function createCliRunner(bin: string = defaultCliBin()): CliRunner {
  return (args, options) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (text: string) => options.onStdout?.(text));
    child.stderr?.on('data', (text: string) => options.onStderr?.(text));
    const exited = new Promise<CliExit>((resolve) => {
      child.once('error', (error) => resolve({ code: null, signal: null, error }));
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
    return {
      exited,
      kill(signal: NodeJS.Signals = 'SIGTERM') {
        if (child.exitCode === null && child.signalCode === null) child.kill(signal);
      },
    };
  };
}

export interface CliResult extends CliExit {
  stdout: string;
  stderr: string;
}

const MAX_CAPTURE = 1024 * 1024;

function keepTail(text: string): string {
  return text.length > MAX_CAPTURE ? text.slice(-MAX_CAPTURE) : text;
}

/** Runs the CLI to completion and collects its output; aborting the signal kills it. */
export async function runCli(runner: CliRunner, args: string[], cwd: string, signal?: AbortSignal): Promise<CliResult> {
  let stdout = '';
  let stderr = '';
  const child = runner(args, {
    cwd,
    onStdout: (text) => { stdout = keepTail(stdout + text); },
    onStderr: (text) => { stderr = keepTail(stderr + text); },
  });
  const abort = () => child.kill('SIGTERM');
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const exit = await child.exited;
    return { ...exit, stdout, stderr };
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/**
 * The useful part of a failed command's stderr: from the last "<Command> failed:" line on, or
 * else the last few lines.
 */
export function errorFromStderr(stderr: string, prefix?: string): string {
  const text = stripAnsi(stderr).trim();
  if (!text) return '';
  if (prefix) {
    const at = text.lastIndexOf(prefix);
    if (at !== -1) return text.slice(at + prefix.length).trim().slice(0, 2000);
  }
  return text.split(/\r?\n/).filter((line) => line.trim()).slice(-5).join('\n').slice(-2000);
}
