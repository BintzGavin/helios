#!/usr/bin/env node
import { RenderClient } from '../dist/client.js';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [endpoint, authModule] = process.argv.slice(2);
if (!endpoint) throw new Error('Usage: qualify-service.mjs ENDPOINT [AUTH_PROVIDER_MODULE]');
const headers = authModule ? (await import(pathToFileURL(resolve(authModule)).href)).headers : undefined;
const client = new RenderClient(endpoint, { headers });
const plan = { version: 'portable-v1', width: 640, height: 360, fps: { num: 30000, den: 1001 }, frameCount: 91, background: '#10242d', nodes: [{ id: 'box', type: 'rect', y: 120, x: { keyframes: [{ frame: 0, value: 0 }, { frame: 90, value: 500 }] }, width: 120, height: 120, radius: 20, fill: '#dfff83' }] };
const key = `qualification-${Date.now()}`;
const first = await client.submit(plan, key), second = await client.submit(plan, key);
if (first.id !== second.id) throw new Error('Idempotency failed');
let conflict = false;
try { await client.submit({ ...plan, frameCount: 92 }, key); } catch (error) { conflict = error.status === 409; }
if (!conflict) throw new Error('Conflicting idempotency input was accepted');
const complete = await client.wait(first.id, { onProgress: job => console.log(`${job.state}: ${job.progress}%`) });
const video = new Uint8Array(await (await client.download(first.id)).arrayBuffer());
if (createHash('sha256').update(video).digest('hex') !== complete.output.sha256) throw new Error('Downloaded artifact failed its identity check');
const cancellation = await client.submit(plan, `${key}-cancel`);
if ((await client.cancel(cancellation.id)).state !== 'canceled') throw new Error('Cancellation failed');
await writeFile('portable-qualification.mp4', video);
console.log(JSON.stringify({ status: 'smoke-passed', engine: complete.engine, bytes: video.length, output: 'portable-qualification.mp4', qualified: false }));
