/**
 * buildPageShim() must give a plain browser page (no renderer, no CDP, no addInitScript)
 * the renderer's "frame at t" semantics: put it in a <script> before the page's own
 * scripts and window.__helios_seek(t, timeoutMs) works as it does during a render.
 * This is what in-conversation playback (MCP App views) relies on.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { buildPageShim } from '../src/index';

const HOOK_PAGE = (shim: string) => `<!doctype html><html><head>
<script>${shim}</script>
<script>window.renderAt = (t) => { document.body.dataset.t = String(t); };</script>
</head><body></body></html>`;

async function main() {
  const shim = buildPageShim();
  assert.ok(!/<\/script/i.test(shim), 'The shim must be safe to inline in a <script> element');

  const browser = await chromium.launch();
  try {
    // 1. A page whose first script is the shim: seeking calls the hook and sets virtual time.
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    await page.setContent(HOOK_PAGE(shim));
    await page.evaluate(() => (window as any).__helios_seek(1.5, 2000));
    const state = await page.evaluate(() => ({
      t: document.body.dataset.t,
      now: performance.now(),
      date: Date.now(),
      virtual: (window as any).__HELIOS_VIRTUAL_TIME__,
    }));
    assert.equal(state.t, '1.5', 'window.renderAt(t) must be called with the seek time');
    assert.equal(state.now, 1500, 'performance.now() must report the virtual time in ms');
    assert.equal(state.date, 1704067200000 + 1500, 'Date.now() must follow the fixed epoch plus virtual time');
    assert.equal(state.virtual, 1500);
    assert.deepEqual(pageErrors, [], 'Installing the shim must not throw in a plain page');

    // 2. Math.random() is seeded the same way on every load.
    const seq = () => page.evaluate(() => [Math.random(), Math.random(), Math.random()]);
    await page.setContent(HOOK_PAGE(shim));
    const first = await seq();
    await page.setContent(HOOK_PAGE(shim));
    assert.deepEqual(await seq(), first, 'Math.random() must be deterministic across loads');

    // 3. An async hook is awaited, and a throwing hook rejects with the page's error.
    await page.setContent(`<script>${shim}</script><script>
      window.seek = (t) => new Promise((r) => setTimeout(() => { document.body.dataset.t = String(t); r(); }, 50));
    </script><body></body>`);
    await page.evaluate(() => (window as any).__helios_seek(2.25, 2000));
    assert.equal(await page.evaluate(() => document.body.dataset.t), '2.25', 'An async hook must be awaited');
    await page.setContent(`<script>${shim}</script><script>
      window.renderAt = (t) => { throw new Error('boom at ' + t); };
    </script>`);
    const message = await page.evaluate(() =>
      Promise.resolve().then(() => (window as any).__helios_seek(0.5, 2000)).then(() => null, (e: Error) => e.message));
    assert.ok(message && message.includes('window.renderAt(0.5) threw') && message.includes('boom at 0.5'),
      `A throwing hook must reject with the page error, got: ${message}`);

    // 4. flushAnimationFrames runs queued rAF callbacks during the seek, at virtual time.
    await page.setContent(`<script>${buildPageShim({ flushAnimationFrames: true })}</script><script>
      window.renderAt = () => {};
      window.__frames = [];
    </script>`);
    const frames = await page.evaluate(() => {
      (window as any).__frames.length = 0;
      requestAnimationFrame((ts) => (window as any).__frames.push(ts));
      (window as any).__helios_seek(0.75, 2000);
      return (window as any).__frames.slice();
    });
    assert.deepEqual(frames, [750], 'Queued rAF callbacks must run synchronously in the seek with virtual time');

    // 5. The real target: the shim at the top of a srcdoc iframe in a normal page.
    await page.setContent('<body></body>');
    await page.evaluate((html) => new Promise<void>((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    }), HOOK_PAGE(shim));
    const frame = page.frames().find((f) => f !== page.mainFrame());
    assert.ok(frame, 'srcdoc iframe must load');
    await frame!.evaluate(() => (window as any).__helios_seek(1.5, 2000));
    assert.deepEqual(
      await frame!.evaluate(() => ({ t: document.body.dataset.t, now: performance.now() })),
      { t: '1.5', now: 1500 },
      'The shim must work the same inside a srcdoc iframe'
    );
    assert.deepEqual(pageErrors, [], 'No page errors expected');
  } finally {
    await browser.close();
  }
  console.log('✅ buildPageShim() gives a plain browser page the renderer seek semantics.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
