// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createSecretStoreAuthenticator, validateRemoteOptions } from './remote-startup';

it('requires HTTPS and an explicit OS secret store service with no path or URL credentials', () => {
  expect(() => validateRemoteOptions({ publicUrl: 'http://example.com', secretService: 'helios', port: 5174 })).toThrow();
  expect(() => validateRemoteOptions({ publicUrl: 'https://example.com/prefix', secretService: 'helios', port: 5174 })).toThrow();
  expect(() => validateRemoteOptions({ publicUrl: 'https://example.com', secretService: '', port: 5174 })).toThrow();
  expect(validateRemoteOptions({ publicUrl: 'https://example.com', secretService: 'helios-owner', port: 5174 }).publicUrl).toBe('https://example.com');
});
it('checks the store per request, accepts only exact bearer values, and fails closed on store errors', async () => {
  let material = randomBytes(32).toString('hex');
  const read = vi.fn(async () => Buffer.from(material));
  const auth = createSecretStoreAuthenticator(read);
  const req = (value?: string) => ({ headers: value ? { authorization: value } : {} }) as any;
  expect(await auth(req())).toBeUndefined();
  expect(Boolean(await auth(req(`Bearer ${material}`)))).toBe(true);
  const stale = material; material = randomBytes(32).toString('hex');
  expect(Boolean(await auth(req(`Bearer ${stale}`)))).toBe(false);
  expect(Boolean(await auth(req(`Basic ${material}`)))).toBe(false);
  read.mockRejectedValueOnce(new Error('Store unavailable'));
  expect(Boolean(await auth(req(`Bearer ${material}`)))).toBe(false);
});
