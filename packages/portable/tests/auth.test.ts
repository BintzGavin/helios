import { expect, it } from 'vitest';
import { oidcAuthorizer } from '../src/auth.js';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';

it('requires an explicit HTTPS trust boundary and subject allowlist', () => {
  expect(() => oidcAuthorizer({ issuer: 'http://insecure.invalid', jwksUrl: 'https://issuer.invalid/keys', audience: 'audience', subjects: {} })).toThrow();
});
it('rejects absent or malformed authorization before any tenant can be selected', async () => {
  const authorize = oidcAuthorizer({ issuer: 'https://issuer.invalid', jwksUrl: 'https://issuer.invalid/keys', audience: 'audience', subjects: { workload: 'tenant' } });
  expect(await authorize(new Request('https://render.invalid', { headers: { 'x-tenant': 'tenant' } }))).toBeNull();
});
it('accepts only signed, unexpired, allowlisted workload identities with the configured issuer and audience', async () => {
  // Ephemeral signing material stays inside this test process and is never serialized to disk or logs.
  const pair = await generateKeyPair('ES256'), publicKey = await exportJWK(pair.publicKey);
  const config = { issuer: 'https://issuer.invalid', jwksUrl: 'https://issuer.invalid/keys', audience: 'renderer', subjects: { workload: 'tenant' } };
  const authorize = oidcAuthorizer(config, createLocalJWKSet({ keys: [{ ...publicKey, alg: 'ES256', kid: 'ephemeral' }] }));
  async function check(issuer: string, audience: string, subject: string, expired = false, signing = pair.privateKey) {
    const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: 'ephemeral' }).setIssuer(issuer).setAudience(audience).setSubject(subject).setIssuedAt().setExpirationTime(expired ? 1 : '2m').sign(signing);
    return authorize(new Request('https://render.invalid', { headers: { authorization: `Bearer ${jwt}`, 'x-tenant': 'different-tenant' } }));
  }
  expect(await check(config.issuer, config.audience, 'workload')).toBe('tenant');
  expect(await check('https://different.invalid', config.audience, 'workload')).toBeNull();
  expect(await check(config.issuer, 'different', 'workload')).toBeNull();
  expect(await check(config.issuer, config.audience, 'not-allowed')).toBeNull();
  expect(await check(config.issuer, config.audience, 'workload', true)).toBeNull();
  expect(await check(config.issuer, config.audience, 'workload', false, (await generateKeyPair('ES256')).privateKey)).toBeNull();
});
