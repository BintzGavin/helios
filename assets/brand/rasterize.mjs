#!/usr/bin/env node
// Rasterises the generated SVGs with the Chromium that ships with Playwright.
// Run after generate.mjs: node assets/brand/rasterize.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');

const jobs = [
  { svg: 'assets/brand/icon.svg', out: 'assets/brand/icon-1024.png', w: 1024, h: 1024 },
  { svg: 'assets/brand/icon.svg', out: 'assets/brand/icon-512.png', w: 512, h: 512 },
  { svg: 'assets/brand/icon.svg', out: 'assets/brand/icon-256.png', w: 256, h: 256 },
  { svg: 'assets/brand/icon.svg', out: 'assets/brand/icon-128.png', w: 128, h: 128 },
  { svg: 'assets/brand/icon.svg', out: 'plugins/helios/assets/logo.png', w: 512, h: 512 },
  { svg: 'assets/brand/icon.svg', out: 'docs/site/favicon.png', w: 64, h: 64 },
  { svg: 'assets/brand/social-card.svg', out: 'assets/brand/social-card.png', w: 1200, h: 630 },
];

const browser = await chromium.launch();
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.w, height: job.h }, deviceScaleFactor: 1 });
  const svg = fs.readFileSync(path.join(repo, job.svg), 'utf8');
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">` +
    `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="display:block;width:${job.w}px;height:${job.h}px"></body></html>`);
  await page.screenshot({ path: path.join(repo, job.out), omitBackground: true });
  await page.close();
  console.log('wrote', job.out);
}
await browser.close();
