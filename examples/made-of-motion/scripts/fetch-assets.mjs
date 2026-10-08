#!/usr/bin/env node
// Fetch the media of the original fframes film into ./assets, pinned to the commit that
// merged dmtrKovalenko/fframes#193, and verify every file against its SHA-256. Then
// decode the portrait footage into lossless PNG frames: ffmpeg's conversion matches the
// RGBA frames fframes decodes bit for bit, so the shader sees identical pixels.
//
//   node scripts/fetch-assets.mjs                 # download from GitHub
//   node scripts/fetch-assets.mjs --from ../fframes/examples/made-of-motion   # local checkout

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = '81dd937387336f0e4288e062ea9313c8aa1a518f';
const REMOTE = `https://raw.githubusercontent.com/dmtrKovalenko/fframes/${COMMIT}/examples/made-of-motion`;

// source path in the fframes example → [path under ./assets, sha256 from its assets.json]
const FILES = {
  'media/Inter_24pt-Bold.ttf': ['media/Inter_24pt-Bold.ttf', '6e56a080abad19a16d985801909378d26d0da425265289d5d1ebf38baa50cba9'],
  'media/InstrumentSerif-Italic.ttf': ['media/InstrumentSerif-Italic.ttf', '08939b8bdf534afec24ae0ef5e03f948940cd9a8fe08e7fecbad040e62327385'],
  'media/JetBrainsMono-Regular.ttf': ['media/JetBrainsMono-Regular.ttf', '4391a6a20152f6c1cd05524e81c594b1a556117e027332a1c7042e799b7777e8'],
  'media/objects.png': ['media/objects.png', '370bade0a5b2347bc50dd6daa286a2d271702900f5fabdae327f2d118d97aec3'],
  'media/hand-field.png': ['media/hand-field.png', 'cb1813c57d9356df9e92a27ed3d5f4bcfb4964a88999984c8c9359dfd024a58e'],
  'src/vector_ink/000.paths.gz': ['vector_ink/000.paths.gz', 'e603c3b3b64a7bfa69a39d0255ea3eb58a81334cffa64722aa74058ca4ca25f5'],
  'src/vector_ink/100.paths.gz': ['vector_ink/100.paths.gz', 'e266b7a4e11a532c847113a255433668936fc6c576654be6a6a94e9d54c25eb9'],
  'src/vector_ink/200.paths.gz': ['vector_ink/200.paths.gz', '5c27feb87a58f3b89a9c26562c66f0ca2189130767ec4c8683cdd105c6cce180'],
  'src/vector_ink/300.paths.gz': ['vector_ink/300.paths.gz', '0f45f14c0f941a338bac41c9b0c462989399a40727ff7b8001670a36eaf155c4'],
  'src/vector_ink/400.paths.gz': ['vector_ink/400.paths.gz', '2c7ab1d08dfd61c7bca24e1df178fe257fe23c3472f9a02955c78d74a9929af7'],
  'dynamic_media/portrait-clean.mp4': ['portrait-clean.mp4', '215ebf6ccec5496524e7d6f63d892d1ddb54ab08de3157c87104deb5edc8ea1c'],
  'dynamic_media/soundtrack.m4a': ['soundtrack.m4a', '487fb902ee7ed1cbc733ea37214ebcf84c7d7f42681fc18721f1fa7249c67e17'],
};

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.resolve(here, '../assets');
const fromIndex = process.argv.indexOf('--from');
const from = fromIndex > 0 ? path.resolve(process.argv[fromIndex + 1]) : null;

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function read(source) {
  if (from) return fs.readFileSync(path.join(from, source));
  const response = await fetch(`${REMOTE}/${source}`);
  if (!response.ok) throw new Error(`GET ${REMOTE}/${source}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

for (const [source, [target, hash]] of Object.entries(FILES)) {
  const file = path.join(assets, target);
  if (fs.existsSync(file) && sha256(fs.readFileSync(file)) === hash) {
    console.log(`ok       ${target}`);
    continue;
  }
  const data = await read(source);
  if (sha256(data) !== hash) throw new Error(`${source}: SHA-256 mismatch, expected ${hash}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log(`fetched  ${target} (${(data.length / 1e6).toFixed(1)} MB)`);
}

const frames = path.join(assets, 'portrait');
if (!fs.existsSync(path.join(frames, '059.png'))) {
  fs.mkdirSync(frames, { recursive: true });
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', path.join(assets, 'portrait-clean.mp4'),
    '-start_number', '0', '-pix_fmt', 'rgb24', path.join(frames, '%03d.png'),
  ], { stdio: 'inherit' });
  console.log('decoded  portrait/000-059.png');
}
console.log(`Assets ready in ${path.relative(process.cwd(), assets) || '.'}`);
