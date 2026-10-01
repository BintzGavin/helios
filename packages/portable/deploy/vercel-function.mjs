import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import ffmpeg from 'ffmpeg-static';
import { RenderService, NativeBackend } from '../dist/index.js';
import { S3Store } from '../dist/s3-storage.js';
import { createRenderHandler, nodeHandler } from '../dist/server.js';
import { oidcAuthorizer } from '../dist/auth.js';

// Public identifiers only. The host's OIDC provider supplies short-lived credentials.
const config = JSON.parse(readFileSync(new URL('../portable-config.json', import.meta.url), 'utf8'));
if (config.rasterizer !== undefined && !['native', 'skia'].includes(config.rasterizer)) throw new Error('Function rasterizer must be native or skia');
const require = createRequire(import.meta.url);
const ffprobe = join(dirname(require.resolve('ffprobe-static/package.json')), 'bin/linux/x64/ffprobe');
const store = new S3Store(new S3Client({ region: config.region, credentials: awsCredentialsProvider({ roleArn: config.roleArn }) }), config.bucket);
const service = new RenderService(store, new NativeBackend({ ffmpeg, ffprobe, rasterizer: config.rasterizer ?? 'native' }), { workspace: '/tmp/helios-portable', chunkFrames: 30, leaseMs: 60000, maxConcurrent: 1, maxDurationSeconds: 60, maxWorkBytes: 450 * 1024 * 1024 });
const handler = createRenderHandler(service, { authorize: oidcAuthorizer(config.oidc), maxUploadBytes: 2 * 1024 * 1024, maxDownloadBytes: 2 * 1024 * 1024 });
// Each invocation performs at most one durable step. The caller's workflow drives advance.
const serve = nodeHandler(handler);
export default function render(request, response) {
  const url = new URL(request.url, 'https://render.invalid');
  const path = url.searchParams.get('portablePath');
  if (path) request.url = path;
  return serve(request, response);
}
