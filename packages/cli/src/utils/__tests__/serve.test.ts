import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveLocalPage } from '../serve.js';

describe('serveLocalPage', () => {
  let dir: string;
  let served: { url: string; close: () => Promise<void> };
  const origin = () => new URL(served.url).origin;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-serve-'));
    fs.mkdirSync(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'page.html'), '<!doctype html><title>t</title>');
    fs.writeFileSync(path.join(dir, 'data', 'sales.csv'), 'year,value\n2024,1\n');
    fs.writeFileSync(path.join(dir, 'track.mp3'), Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256)));
    served = await serveLocalPage(path.join(dir, 'page.html'));
  });

  afterAll(async () => {
    await served.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('serves the page over http on localhost', async () => {
    expect(served.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/page\.html$/);
    const res = await fetch(served.url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serves files next to the page, so the page can fetch() them', async () => {
    const res = await fetch(`${origin()}/data/sales.csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(await res.text()).toBe('year,value\n2024,1\n');
  });

  it('answers byte ranges, as media elements and ffmpeg seeking need', async () => {
    const res = await fetch(`${origin()}/track.mp3`, { headers: { Range: 'bytes=10-19' } });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 10-19/1000');
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('refuses paths outside the served folder', async () => {
    const res = await fetch(`${origin()}/..%2F..%2Fetc%2Fpasswd`);
    expect([403, 404]).toContain(res.status);
  });

  it('returns 404 for missing files', async () => {
    const res = await fetch(`${origin()}/missing.png`);
    expect(res.status).toBe(404);
  });
});
