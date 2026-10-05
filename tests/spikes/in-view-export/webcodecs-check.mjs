#!/usr/bin/env node
// Which Chromium builds can encode H.264 (and AAC) with WebCodecs? Prints one JSON line per browser.
//   node tests/spikes/in-view-export/webcodecs-check.mjs
import http from 'http';
import { chromium } from 'playwright';

// WebCodecs needs a secure context; about:blank is not one, http://localhost is.
const srv = http.createServer((_q, r) => r.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>probe</title>'));
await new Promise((r) => srv.listen(0, r));
const URL_ = `http://localhost:${srv.address().port}/`;

const variants = [
  { name: 'playwright chromium-headless-shell (headless: true)', opts: { headless: true } },
  { name: 'playwright chromium, new headless (channel: chromium)', opts: { headless: true, channel: 'chromium' } },
  { name: 'Google Chrome, new headless (channel: chrome)', opts: { headless: true, channel: 'chrome' } },
];

const probe = async () => {
  const configs = {
    'avc1.42001f 1280x720 (baseline 3.1)': { codec: 'avc1.42001f', width: 1280, height: 720 },
    'avc1.640028 1920x1080 (high 4.0)': { codec: 'avc1.640028', width: 1920, height: 1080 },
    'avc1.4d0028 1920x1080 (main 4.0)': { codec: 'avc1.4d0028', width: 1920, height: 1080 },
    'vp09.00.40.08 1920x1080': { codec: 'vp09.00.40.08', width: 1920, height: 1080 },
  };
  const out = { userAgent: navigator.userAgent, VideoEncoder: typeof VideoEncoder !== 'undefined' };
  if (!out.VideoEncoder) return out;
  for (const [label, c] of Object.entries(configs)) {
    const r = {};
    for (const hw of ['no-preference', 'prefer-hardware', 'prefer-software']) {
      try {
        const s = await VideoEncoder.isConfigSupported({ ...c, bitrate: 5_000_000, framerate: 30, hardwareAcceleration: hw });
        r[hw] = s.supported;
      } catch (e) {
        r[hw] = 'error: ' + e.message;
      }
    }
    out[label] = r;
  }
  // Audio: ClientSideExporter muxes AAC into MP4 (Opus into WebM).
  for (const codec of ['mp4a.40.2', 'opus']) {
    try {
      const s = await AudioEncoder.isConfigSupported({ codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 });
      out['audio ' + codec] = s.supported;
    } catch (e) {
      out['audio ' + codec] = 'error: ' + e.message;
    }
  }
  return out;
};

for (const v of variants) {
  let browser;
  try {
    browser = await chromium.launch(v.opts);
    const page = await browser.newPage();
    await page.goto(URL_);
    const r = await page.evaluate(probe);
    console.log(JSON.stringify({ browser: v.name, version: browser.version(), ...r }));
  } catch (e) {
    console.log(JSON.stringify({ browser: v.name, error: String(e.message).split('\n')[0] }));
  } finally {
    await browser?.close();
  }
}
srv.close();
