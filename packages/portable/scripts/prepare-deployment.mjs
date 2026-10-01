#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const [target, directory] = process.argv.slice(2);
if (!['vm', 'vercel'].includes(target) || !directory) throw new Error('Usage: node scripts/prepare-deployment.mjs vm|vercel OUTPUT_DIRECTORY');
const root = fileURLToPath(new URL('../', import.meta.url)), output = resolve(directory);
await stat(join(root, 'dist/index.js')).catch(() => { throw new Error('Build @helios-project/portable first'); });
await mkdir(output, { recursive: false });
const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
await cp(join(root, 'dist'), join(output, 'dist'), { recursive: true });
const dependencies = { ...source.dependencies };
if (target === 'vercel') Object.assign(dependencies, { '@vercel/oidc-aws-credentials-provider': '3.3.7', 'ffmpeg-static': '5.3.0', 'ffprobe-static': '3.1.0' });
await writeFile(join(output, 'package.json'), JSON.stringify({ name: 'helios-portable-deployment', private: true, type: 'module', engines: { node: '22.x' }, dependencies }, null, 2) + '\n');
if (target === 'vm') {
  await cp(join(root, 'deploy/Dockerfile'), join(output, 'Dockerfile'));
  await cp(join(root, 'deploy/Dockerfile.full'), join(output, 'Dockerfile.full'));
  await cp(join(root, 'scripts/build-codecs.sh'), join(output, 'build-codecs.sh'));
  await writeFile(join(output, '.dockerignore'), 'node_modules\n.git\nportable-data\n*.mp4\n');
} else {
  await mkdir(join(output, 'api'));
  await cp(join(root, 'deploy/vercel-function.mjs'), join(output, 'api/render.mjs'));
  await cp(join(root, 'deploy/vercel.json'), join(output, 'vercel.json'));
  await cp(join(root, 'deploy/verify-runtime.mjs'), join(output, 'verify-runtime.mjs'));
}
console.log(`Prepared ${target} deployment at ${output}. No service was provisioned.`);
