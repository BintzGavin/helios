import { expect, it } from 'vitest';
import { initializeOwnedSandbox } from '../benchmarks/cloudflare/lifecycle.mjs';
it('sets a finite idle cap and disables indefinite keepalive before returning', async () => {
  const events: unknown[] = [];
  const sandbox = { async setSleepAfter(value: unknown) { events.push(value); }, async setKeepAlive(value: unknown) { events.push(value); }, async destroy() { events.push('destroy'); } };
  expect(await initializeOwnedSandbox(sandbox, '90m')).toBe(sandbox); expect(events).toEqual(['90m', false]);
});
it('destroys a partially initialized owned sandbox after configuration failure', async () => {
  let destroyed = false; const sandbox = { async setSleepAfter() { throw new Error('failed'); }, async setKeepAlive() {}, async destroy() { destroyed = true; } };
  await expect(initializeOwnedSandbox(sandbox, '90m')).rejects.toThrow(); expect(destroyed).toBe(true);
});
