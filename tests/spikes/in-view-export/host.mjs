// Drives the ext-apps basic-host (http://localhost:8080) with Playwright: calls preview_video,
// finds the player view inside the host's double iframe, and runs the spike export there.
import { chromium } from 'playwright';

export const HOST_URL = process.env.HOST_URL || 'http://localhost:8080';

export async function launch(channel) {
  // channel undefined -> Playwright's chromium-headless-shell; 'chromium' -> new headless.
  return chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
}

/** Opens the view on a page in basic-host and resolves with { page, view } once it plays. */
export async function openView(browser, args, { timeoutMs = 60000, log = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
  page.on('download', (d) => log.push(`[download] ${d.suggestedFilename()}`));
  await page.goto(`${HOST_URL}/?server=helios&tool=preview_video`);
  const ta = page.locator('textarea');
  await ta.waitFor({ timeout: timeoutMs });
  // Wait for the tool list to load, then pick preview_video.
  await page.waitForFunction(() => Array.from(document.querySelectorAll('option')).some((o) => o.value === 'preview_video'), null, { timeout: timeoutMs });
  const selects = page.locator('select');
  const n = await selects.count();
  for (let i = 0; i < n; i++) {
    const vals = await selects.nth(i).locator('option').evaluateAll((os) => os.map((o) => o.value));
    if (vals.includes('preview_video')) await selects.nth(i).selectOption('preview_video');
  }
  await ta.fill(JSON.stringify(args));
  await page.getByRole('button', { name: 'Call Tool' }).click();

  const deadline = Date.now() + timeoutMs;
  let view = null;
  while (Date.now() < deadline) {
    for (const f of page.frames()) {
      const ok = await f.evaluate(() => !!(window.__heliosSpikeExport && window.__heliosSpike && window.__heliosSpike.S.win)).catch(() => false);
      if (ok) { view = f; break; }
    }
    if (view) break;
    await page.waitForTimeout(250);
  }
  if (!view) throw new Error('The player view did not load a page in time:\n' + log.slice(-10).join('\n'));
  return { ctx, page, view };
}

export async function hostCaps(view) {
  return view.evaluate(() => window.__heliosSpike.host.caps);
}

export async function runExport(view, opts, timeoutMs = 600000) {
  return view.evaluate(async ({ opts, timeoutMs }) => {
    const t = setTimeout(() => {}, timeoutMs);
    try { return await window.__heliosSpikeExport(opts); } finally { clearTimeout(t); }
  }, { opts, timeoutMs });
}
