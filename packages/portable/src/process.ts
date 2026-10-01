import { spawn } from 'node:child_process';
import { RenderError } from './plan.js';

/** No shell, environment inspection, or unbounded diagnostic buffers. */
export function startProcess(command: string, args: string[], options: { signal?: AbortSignal; timeoutMs?: number } = {}) {
  options.signal?.throwIfAborted();
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
  let diagnostic = '';
  child.stderr.on('data', (data: Buffer) => { diagnostic = (diagnostic + data.toString()).slice(-8192); });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const kill = () => { if (killTimer) return; child.kill('SIGTERM'); killTimer = setTimeout(() => child.kill('SIGKILL'), 1000); killTimer.unref(); };
  const done = new Promise<void>((resolve, reject) => {
    child.once('error', () => reject(new RenderError('PROCESS_START', 'Required media executable could not start', 500)));
    child.once('close', code => {
      if (options.signal?.aborted) reject(options.signal.reason instanceof RenderError ? options.signal.reason : new RenderError('INTERRUPTED', 'Render step interrupted; retry is safe', 503));
      else if (timedOut) reject(new RenderError('PROCESS_TIMEOUT', 'Media process exceeded its time budget', 503));
      else if (code !== 0) reject(new RenderError('MEDIA_PROCESS', `Media process failed (${code ?? 'terminated'})`, 500));
      else resolve();
    });
  }).finally(() => { clearTimeout(timer); clearTimeout(killTimer); options.signal?.removeEventListener('abort', kill); });
  // Consumers may still be feeding stdin when the child exits.
  void done.catch(() => {});
  options.signal?.addEventListener('abort', kill, { once: true });
  if (options.timeoutMs) { timer = setTimeout(() => { timedOut = true; kill(); }, options.timeoutMs); timer.unref(); }
  child.stdin.on('error', () => {});
  return { child, done, kill, diagnostic: () => diagnostic };
}
export async function runProcess(command: string, args: string[], options: { signal?: AbortSignal; timeoutMs?: number; maxBytes?: number } = {}): Promise<Buffer> {
  const process = startProcess(command, args, options);
  const chunks: Buffer[] = [];
  let bytes = 0, overflow = false;
  process.child.stdout.on('data', (data: Buffer) => {
    bytes += data.length;
    if (bytes > (options.maxBytes ?? 4 * 1024 * 1024)) { overflow = true; process.kill(); } else chunks.push(data);
  });
  process.child.stdin.end();
  try { await process.done; } catch (error) { if (!overflow) throw error; }
  if (overflow) throw new RenderError('RESOURCE_LIMIT', 'Media process output exceeded its limit');
  return Buffer.concat(chunks);
}
