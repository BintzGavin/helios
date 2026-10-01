import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface OidcConfig { issuer: string; audience: string; jwksUrl: string; subjects: Record<string, string> }
/** Map verified workload subjects to tenants. Raw bearer values never enter logs/state. */
export function oidcAuthorizer(config: OidcConfig, keySet?: JWTVerifyGetKey) {
  if (new URL(config.issuer).protocol !== 'https:' || new URL(config.jwksUrl).protocol !== 'https:' || !config.audience || !Object.keys(config.subjects).length) throw new Error('OIDC requires HTTPS issuer/JWKS, audience and an explicit subject allowlist');
  const keys = keySet ?? createRemoteJWKSet(new URL(config.jwksUrl), { timeoutDuration: 5000 });
  return async (request: Request): Promise<string | null> => {
    const value = request.headers.get('authorization');
    if (!value?.startsWith('Bearer ') || value.length > 16384) return null;
    try {
      const { payload } = await jwtVerify(value.slice(7), keys, { issuer: config.issuer, audience: config.audience, algorithms: ['RS256', 'ES256'], requiredClaims: ['exp', 'iat', 'sub'], clockTolerance: 5 });
      return payload.sub && Object.hasOwn(config.subjects, payload.sub) ? config.subjects[payload.sub] : null;
    } catch { return null; }
  };
}
