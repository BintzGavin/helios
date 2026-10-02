import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Frame, type Page } from 'playwright';

// Drives player.html inside a fake MCP Apps host (no MCP server). The host page and the
// view are served from different fake origins, as real hosts do, and talk only through
// window.postMessage with plain JSON-RPC 2.0 objects.

const HOST_URL = 'https://host.test/';
const VIEW_URL = 'https://view.test/player.html';

const STUB_SHIM =
  'window.__helios_seek = (t) => { window.__HELIOS_VIRTUAL_TIME__ = t * 1000; if (window.renderAt) return window.renderAt(t); };';

const viewHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'player.html'), 'utf8')
  .split('"__HELIOS_PAGE_SHIM__"')
  .join(JSON.stringify(STUB_SHIM).replace(/</g, '\\u003c'));

const FIXTURE_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;width:640px;height:360px;background:#111;overflow:hidden}
.title{position:absolute;left:100px;top:80px;width:200px;height:100px;background:#e33;color:#fff;font:24px sans-serif}
</style></head>
<body><div class="title hero">Hello   Helios</div>
<script>
window.renderAt = (t) => {
  document.body.dataset.t = String(t);
  document.querySelector('.title').style.left = (100 + t * 20) + 'px';
};
</script></body></html>`;

interface Scenario {
  hostCapabilities?: Record<string, unknown>;
  toolInput: Record<string, unknown>;
  toolResult: Record<string, unknown>;
}

const HOST_PAGE = `<!doctype html><html><body style="margin:0"><script>
window.__sent = [];
const f = document.createElement('iframe');
f.src = ${JSON.stringify(VIEW_URL)};
f.style.cssText = 'width:700px;height:300px;border:0;display:block';
document.body.appendChild(f);
const send = (m) => f.contentWindow.postMessage(m, '*');
window.__send = send;
window.addEventListener('message', async (e) => {
  if (e.source !== f.contentWindow) return;
  const m = e.data;
  window.__sent.push(m);
  const sc = await window.__scenario();
  if (m.method === 'ui/initialize') {
    send({ jsonrpc: '2.0', id: m.id, result: {
      protocolVersion: '2026-01-26',
      hostInfo: { name: 'fake-host', version: '0.0.0' },
      hostCapabilities: sc.hostCapabilities || { updateModelContext: { text: {} }, serverTools: {} },
      hostContext: { theme: 'dark', displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] },
    } });
  } else if (m.method === 'ui/notifications/initialized') {
    send({ jsonrpc: '2.0', method: 'ui/notifications/tool-input', params: { arguments: sc.toolInput } });
    send({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: sc.toolResult });
  } else if (m.method === 'ui/notifications/size-changed') {
    f.style.height = m.params.height + 'px';
  } else if (m.method === 'tools/call') {
    const result = await window.__tool(m.params.name, m.params.arguments);
    send({ jsonrpc: '2.0', id: m.id, result });
  } else if (m.method && m.id !== undefined) {
    send({ jsonrpc: '2.0', id: m.id, result: {} });
  }
});
</script></body></html>`;

type Msg = { jsonrpc: string; id?: number | string; method?: string; params?: any; result?: any; error?: any };

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

async function openHost(scenario: Scenario, tools: Record<string, (args: any) => unknown>) {
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  const calls: { name: string; args: any }[] = [];
  await page.exposeFunction('__scenario', () => scenario);
  await page.exposeFunction('__tool', (name: string, args: any) => {
    calls.push({ name, args });
    const handler = tools[name];
    if (!handler) return { isError: true, content: [{ type: 'text', text: `unknown tool ${name}` }] };
    return handler(args);
  });
  await page.route('https://host.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: HOST_PAGE }));
  await page.route('https://view.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: viewHtml }));
  await page.goto(HOST_URL);
  const sent = () => page.evaluate(() => (window as any).__sent as Msg[]);
  const view = () => page.frames().find((f) => f.url() === VIEW_URL) as Frame;
  return { page, calls, sent, view };
}

function innerFrame(page: Page): Frame | undefined {
  return page.frames().find((f) => f.url() === 'about:srcdoc');
}

async function waitFor<T>(fn: () => Promise<T | undefined | false> | T | undefined | false, what: string, ms = 10_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v as T;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

const playerScenario: Scenario = {
  toolInput: { path: 'video.html' },
  toolResult: {
    content: [{ type: 'text', text: 'Opened video.html' }],
    structuredContent: { mode: 'player', path: 'video.html', duration: 4, width: 640, height: 360, fps: 30 },
  },
};

describe('player.html view with a fake MCP Apps host', { timeout: 60_000 }, () => {
  it('handshakes, plays, scrubs, selects, renders and answers host requests', async () => {
    const { page, calls, sent, view } = await openHost(playerScenario, {
      read_page: (args) => ({
        content: [{ type: 'text', text: 'ok' }],
        structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] },
      }),
      render_video: () => ({
        content: [{ type: 'text', text: 'running' }],
        structuredContent: { jobId: 'job-1', status: 'running', output: 'out/video.mp4', progress: 0.25, elapsedSeconds: 1 },
      }),
      get_render_status: (args) => ({
        content: [{ type: 'text', text: 'done' }],
        structuredContent: {
          jobId: args.jobId, status: 'completed', output: 'out/video.mp4', absoluteOutput: '/Users/me/Movies/helios/out/video.mp4',
          progress: 1, elapsedSeconds: 3, bytes: 3_500_000,
        },
      }),
      reveal_file: (args) => ({ content: [{ type: 'text', text: `shown ${args.path}` }] }),
    });
    try {
      // Handshake: ui/initialize request first, then the initialized notification.
      const msgs0 = await waitFor(async () => {
        const s = await sent();
        return s.some((m) => m.method === 'ui/notifications/initialized') && s;
      }, 'initialized');
      const initIdx = msgs0.findIndex((m) => m.method === 'ui/initialize');
      const initedIdx = msgs0.findIndex((m) => m.method === 'ui/notifications/initialized');
      expect(initIdx).toBe(0);
      expect(initedIdx).toBeGreaterThan(initIdx);
      const init = msgs0[initIdx];
      expect(init.jsonrpc).toBe('2.0');
      expect(init.id).toBeDefined();
      expect(init.params.protocolVersion).toBe('2026-01-26');
      expect(init.params.appInfo.name).toBeTruthy();
      expect(init.params.appCapabilities.availableDisplayModes).toEqual(['inline', 'fullscreen']);
      expect(msgs0[initedIdx].id).toBeUndefined();

      // The page is fetched through the app-only tool.
      await waitFor(() => calls.find((c) => c.name === 'read_page'), 'read_page');
      expect(calls.find((c) => c.name === 'read_page')!.args).toEqual({ path: 'video.html' });

      // The page loads into a nested srcdoc frame with the shim, and starts playing.
      const inner = await waitFor(() => innerFrame(page), 'inner frame');
      await waitFor(() => inner.evaluate(() => typeof (window as any).__helios_seek === 'function'), 'shim');
      await waitFor(() => inner.evaluate(() => Number(document.body.dataset.t) > 0), 'playback advancing');
      const v = view();
      expect(await v.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await v.isVisible('#fs')).toBe(true);

      // Pause, then scrub to 2.0 s.
      await v.click('#play');
      expect(await v.getAttribute('#play', 'aria-label')).toBe('Play');
      await v.evaluate(() => {
        const r = document.getElementById('scrub') as HTMLInputElement;
        r.value = '2';
        r.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await waitFor(() => inner.evaluate(() => document.body.dataset.t === '2'), 'dataset.t === "2"');
      expect(await v.textContent('#time')).toBe('2.00 / 4.00 s');
      // Still paused: the time does not move on.
      await page.waitForTimeout(200);
      expect(await inner.evaluate(() => document.body.dataset.t)).toBe('2');

      // Frame stepping with the keyboard.
      await v.focus('#wrap');
      await v.press('#wrap', 'ArrowRight');
      await waitFor(() => inner.evaluate(() => document.body.dataset.t === String(61 / 30)), 'step forward');
      await v.press('#wrap', 'ArrowLeft');
      await waitFor(() => inner.evaluate(() => document.body.dataset.t === '2'), 'step back');

      // Clicking an element in the page sends it to the model as context.
      await inner.click('.title');
      const ctx = await waitFor(async () => (await sent()).find((m) => m.method === 'ui/update-model-context'), 'update-model-context');
      expect(ctx.id).toBeDefined();
      expect(ctx.params.structuredContent).toMatchObject({
        path: 'video.html', t: 2, selector: 'div.title.hero', text: 'Hello Helios',
        box: { x: 140, y: 80, width: 200, height: 100 },
      });
      expect(ctx.params.content[0].type).toBe('text');
      expect(ctx.params.content[0].text).toBe(
        'In video.html, the person selected div.title.hero ("Hello Helios") at t=2.00s. Element box in page pixels: 140,80,200,100. Page size 640x360.');
      await waitFor(() => v.evaluate(() => document.getElementById('msg')!.textContent === 'Sent to the conversation'), 'confirmation');
      expect(await v.isVisible('#overlay')).toBe(true);
      // The click did not reach the page's own handlers as a navigation, and playback stays paused.
      expect(await v.getAttribute('#play', 'aria-label')).toBe('Play');

      // "Use this moment" sends the time only.
      await v.click('#moment');
      const ctx2 = await waitFor(async () => (await sent()).filter((m) => m.method === 'ui/update-model-context')[1], 'moment context');
      expect(ctx2.params.structuredContent).toEqual({ path: 'video.html', t: 2 });

      // The view reports its size to the host.
      const sizes = (await sent()).filter((m) => m.method === 'ui/notifications/size-changed');
      expect(sizes.length).toBeGreaterThan(0);
      expect(sizes[0].params.width).toBeGreaterThan(0);
      expect(sizes[0].params.height).toBeGreaterThan(0);

      // Render flows from running to completed.
      await v.click('#render');
      await waitFor(() => v.evaluate(() => /Rendered/.test(document.getElementById('rstat')!.textContent || '')), 'render completed');
      const rtext = await v.textContent('#rstat');
      expect(rtext).toContain('out/video.mp4');
      expect(rtext).toContain('3.5 MB');
      expect(calls.find((c) => c.name === 'render_video')!.args).toEqual({
        path: 'video.html', duration: 4, width: 640, height: 360, fps: 30, waitSeconds: 20,
      });
      expect(calls.find((c) => c.name === 'get_render_status')!.args).toEqual({ jobId: 'job-1', waitSeconds: 20 });

      // The finished render shows where it was saved, and can be shown in its folder or opened.
      expect(await v.isVisible('#rdone')).toBe(true);
      expect(await v.textContent('#rpath')).toBe('/Users/me/Movies/helios/out/video.mp4');
      await v.click('#rreveal');
      await v.click('#ropen');
      await waitFor(() => calls.filter((c) => c.name === 'reveal_file').length === 2, 'reveal calls');
      expect(calls.filter((c) => c.name === 'reveal_file').map((c) => c.args)).toEqual([
        { path: 'out/video.mp4', open: false },
        { path: 'out/video.mp4', open: true },
      ]);

      // Host requests: teardown gets {}, unknown methods get -32601.
      await page.evaluate(() => {
        (window as any).__send({ jsonrpc: '2.0', id: 'td-1', method: 'ui/resource-teardown', params: {} });
        (window as any).__send({ jsonrpc: '2.0', id: 'x-1', method: 'ui/not-a-method', params: {} });
        (window as any).__send({ jsonrpc: '2.0', method: 'ui/notifications/not-a-notification', params: {} });
      });
      const td = await waitFor(async () => (await sent()).find((m) => m.id === 'td-1'), 'teardown response');
      expect(td).toEqual({ jsonrpc: '2.0', id: 'td-1', result: {} });
      const unk = await waitFor(async () => (await sent()).find((m) => m.id === 'x-1'), 'unknown response');
      expect(unk.error.code).toBe(-32601);
      expect(unk.result).toBeUndefined();
    } finally {
      await page.close();
    }
  });

  it('shows render failures with the log tail', async () => {
    const { page, view } = await openHost(playerScenario, {
      read_page: (args) => ({ content: [], structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] } }),
      render_video: () => ({
        content: [],
        structuredContent: { jobId: 'job-2', status: 'failed', output: 'out/video.mp4', progress: null, elapsedSeconds: 2, error: 'FFmpeg exited with code 1', logTail: 'last log line' },
      }),
    });
    try {
      await waitFor(() => innerFrame(page), 'inner frame');
      const v = view();
      await waitFor(() => v.evaluate(() => !(document.getElementById('render') as HTMLButtonElement).disabled), 'render enabled');
      await v.click('#render');
      await waitFor(() => v.evaluate(() => /FFmpeg exited/.test(document.getElementById('rstat')!.textContent || '')), 'failure shown');
      expect(await v.textContent('#rlog pre')).toBe('last log line');
    } finally {
      await page.close();
    }
  });

  it('plays a hosted render inline and opens its download and share links', async () => {
    const { page, sent, view } = await openHost(playerScenario, {
      read_page: (args) => ({ content: [], structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] } }),
      render_video: () => ({
        content: [],
        structuredContent: {
          jobId: 'job-h', status: 'completed', output: 'video.mp4', progress: 1, elapsedSeconds: 9, bytes: 2_000_000,
          url: 'https://cloud.example/r/abc.mp4', shareUrl: 'https://cloud.example/v/abc',
        },
      }),
    });
    try {
      await waitFor(() => innerFrame(page), 'inner frame');
      const v = view();
      await waitFor(() => v.evaluate(() => !(document.getElementById('render') as HTMLButtonElement).disabled), 'render enabled');
      await v.click('#render');
      await waitFor(() => v.evaluate(() => !document.getElementById('rdone')!.hidden), 'render done');
      expect(await v.getAttribute('#rvideo', 'src')).toBe('https://cloud.example/r/abc.mp4');
      expect(await v.isVisible('#rvideo')).toBe(true);
      // A hosted render has no file on this computer: no path, no Show in Finder.
      expect(await v.isVisible('#rpath')).toBe(false);
      expect(await v.isVisible('#rreveal')).toBe(false);
      await v.click('#rdownload');
      await v.click('#rshare');
      const links = await waitFor(async () => {
        const l = (await sent()).filter((m) => m.method === 'ui/open-link');
        return l.length === 2 ? l : undefined;
      }, 'open-link requests');
      expect(links.map((m) => m.params.url)).toEqual(['https://cloud.example/r/abc.mp4', 'https://cloud.example/v/abc']);
    } finally {
      await page.close();
    }
  });

  it('shows the error text when the server has no render tool', async () => {
    const { page, view } = await openHost(playerScenario, {
      read_page: (args) => ({ content: [], structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] } }),
    });
    try {
      await waitFor(() => innerFrame(page), 'inner frame');
      const v = view();
      await waitFor(() => v.evaluate(() => !(document.getElementById('render') as HTMLButtonElement).disabled), 'render enabled');
      await v.click('#render');
      await waitFor(() => v.evaluate(() => /unknown tool render_video/.test(document.getElementById('rstat')!.textContent || '')), 'error shown');
    } finally {
      await page.close();
    }
  });

  it('does not send selections when the host lacks updateModelContext', async () => {
    const { page, sent, view } = await openHost({ ...playerScenario, hostCapabilities: { serverTools: {} } }, {
      read_page: (args) => ({ content: [], structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] } }),
    });
    try {
      const inner = await waitFor(() => innerFrame(page), 'inner frame');
      await waitFor(() => inner.evaluate(() => typeof (window as any).__helios_seek === 'function'), 'shim');
      const v = view();
      await v.click('#play');
      await inner.click('.title', { force: true });
      await waitFor(() => v.evaluate(() => document.getElementById('msg')!.textContent === "This host can't receive selections"), 'no-capability message');
      expect((await sent()).some((m) => m.method === 'ui/update-model-context')).toBe(false);
    } finally {
      await page.close();
    }
  });

  it('lists videos in library mode and opens one', async () => {
    const { page, calls, view } = await openHost(
      { toolInput: {}, toolResult: { content: [], structuredContent: { mode: 'library' } } },
      {
        list_videos: () => ({
          content: [],
          structuredContent: {
            pages: [{ path: 'old.html', modifiedMs: 1000 }, { path: 'new.html', modifiedMs: 2000 }],
            renders: [{ path: 'out/new.mp4', bytes: 1_200_000, modifiedMs: 3000 }],
          },
        }),
        read_page: (args) => ({ content: [], structuredContent: { path: args.path, html: FIXTURE_PAGE, inlined: [], skipped: [] } }),
      },
    );
    try {
      const v = await waitFor(async () => {
        const f = view();
        return f && (await f.locator('#pages button').count()) === 2 && f;
      }, 'library list');
      expect(calls.filter((c) => c.name === 'list_videos')).toHaveLength(1);
      expect(await v.locator('#pages button').allTextContents()).toEqual(['new.html', 'old.html']);
      expect(await v.textContent('#renders')).toContain('out/new.mp4');
      expect(await v.textContent('#renders')).toContain('1.2 MB');
      await v.click('#pages button >> text=new.html');
      await waitFor(() => calls.find((c) => c.name === 'read_page'), 'read_page');
      expect(calls.find((c) => c.name === 'read_page')!.args).toEqual({ path: 'new.html' });
      await waitFor(() => innerFrame(page), 'inner frame');
      expect(await v.isVisible('#libback')).toBe(true);
      // No duration given and the page has no window.helios: fall back to 10 s and say so.
      await waitFor(() => v.evaluate(() => /duration unknown, showing 10 s/.test(document.getElementById('info')!.textContent || '')), 'unknown duration note');
    } finally {
      await page.close();
    }
  });

  it('shows the empty library state', async () => {
    const { page, view } = await openHost(
      { toolInput: {}, toolResult: { content: [], structuredContent: { mode: 'library' } } },
      { list_videos: () => ({ content: [], structuredContent: { pages: [], renders: [] } }) },
    );
    try {
      await waitFor(async () => {
        const f = view();
        return f && /No video pages in this project yet/.test((await f.textContent('#library')) || '');
      }, 'empty state');
    } finally {
      await page.close();
    }
  });

  it('says it needs a host when opened directly', async () => {
    const page = await browser.newPage();
    try {
      await page.route('https://view.test/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: viewHtml }));
      await page.goto(VIEW_URL);
      expect(await page.textContent('#note')).toContain('This view runs inside Claude or ChatGPT.');
    } finally {
      await page.close();
    }
  });
});
