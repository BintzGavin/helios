import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CliChild, CliExit, CliRunner, CliSpawnOptions } from '../cli-runner.js';
import { createHeliosMcpServer, PLAYER_URI, type HeliosMcp } from '../server.js';

/** One `helios …` invocation the fake runner received, with handles to drive it. */
interface FakeCall {
  args: string[];
  cwd: string;
  signals: NodeJS.Signals[];
  out(text: string): void;
  err(text: string): void;
  exit(code: number | null, signal?: NodeJS.Signals | null): void;
}

function fakeRunner(onCall: (call: FakeCall) => void = () => {}) {
  const calls: FakeCall[] = [];
  const runner: CliRunner = (args: string[], options: CliSpawnOptions): CliChild => {
    let resolveExit!: (exit: CliExit) => void;
    const exited = new Promise<CliExit>((resolve) => { resolveExit = resolve; });
    let done = false;
    const call: FakeCall = {
      args,
      cwd: options.cwd,
      signals: [],
      out: (text) => options.onStdout?.(text),
      err: (text) => options.onStderr?.(text),
      exit: (code, signal = null) => {
        if (done) return;
        done = true;
        resolveExit({ code, signal });
      },
    };
    calls.push(call);
    queueMicrotask(() => onCall(call));
    return {
      exited,
      kill(signal: NodeJS.Signals = 'SIGTERM') {
        call.signals.push(signal);
      },
    };
  };
  return { runner, calls };
}

const SHIM = 'window.__shim = "</script><img src=x>";';
const VIEW = '<!doctype html><html><body><script>const PAGE_SHIM = "__HELIOS_PAGE_SHIM__";</script></body></html>';

let tmp: string;
let root: string;
let helios: HeliosMcp;
let client: Client;

let revealed: Array<{ path: string; open: boolean }>;

async function connect(runner: CliRunner = fakeRunner().runner) {
  revealed = [];
  helios = createHeliosMcpServer({
    root,
    runner,
    reveal: async (absPath, open) => { revealed.push({ path: absPath, open }); },
    viewPath: path.join(tmp, 'player.html'),
    buildShim: () => SHIM,
    version: '9.9.9',
    killGraceMs: 50,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test-host', version: '1.0.0' });
  await Promise.all([helios.server.connect(serverTransport), client.connect(clientTransport)]);
}

function write(rel: string, content: string | Buffer = '') {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

async function call(name: string, args: Record<string, unknown> = {}, options?: Parameters<Client['callTool']>[2]) {
  return client.callTool({ name, arguments: args }, undefined, options) as Promise<any>;
}

/** Lets queued microtasks and fake-runner callbacks run. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'helios-mcp-test-')));
  root = path.join(tmp, 'project');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(tmp, 'player.html'), VIEW);
});

afterEach(async () => {
  await client?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('helios MCP server: listing', () => {
  it('lists schemas without a JSON Schema dialect, so hosts read them as 2020-12', async () => {
    await connect();
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect((tool.inputSchema as any).$schema, tool.name).toBeUndefined();
      if (tool.outputSchema) expect((tool.outputSchema as any).$schema, tool.name).toBeUndefined();
    }
    expect(tools.filter((t) => t.outputSchema).length).toBeGreaterThan(0);
  });

  it('lists the ten tools with their view and visibility metadata', async () => {
    await connect();
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(Object.keys(byName).sort()).toEqual([
      'cancel_render', 'get_frames', 'get_render_status', 'helios_library', 'list_videos',
      'preview_video', 'read_page', 'render_video', 'reveal_file', 'verify_video',
    ]);
    expect(client.getServerVersion()).toEqual({ name: 'helios', version: '9.9.9' });

    const opensView = { ui: { resourceUri: PLAYER_URI }, 'openai/outputTemplate': PLAYER_URI };
    expect(byName.preview_video._meta).toEqual(opensView);
    expect(byName.helios_library._meta).toEqual({
      ...opensView,
      'openai/ui': { entrypoints: [{ type: 'global' }, { type: 'thread' }] },
    });
    expect(byName.helios_library.title).toBe('Helios');
    expect(byName.helios_library.inputSchema).toMatchObject({ type: 'object', properties: {} });
    const appOnly = { ui: { visibility: ['app'] }, 'openai/visibility': 'private', 'openai/widgetAccessible': true };
    expect(byName.read_page._meta).toEqual(appOnly);
    expect(byName.list_videos._meta).toEqual(appOnly);
    expect(byName.reveal_file._meta).toEqual(appOnly);
    for (const name of ['render_video', 'get_render_status', 'cancel_render']) {
      expect(byName[name]._meta).toEqual({ 'openai/widgetAccessible': true });
    }
    for (const name of ['get_frames', 'verify_video']) {
      expect(byName[name]._meta).toBeUndefined();
    }

    expect(byName.preview_video.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    for (const name of ['helios_library', 'read_page', 'list_videos', 'get_frames', 'verify_video', 'get_render_status']) {
      expect(byName[name].annotations?.readOnlyHint, name).toBe(true);
    }
    expect(byName.render_video.annotations).toMatchObject({ readOnlyHint: false, idempotentHint: false });
    expect((byName.render_video.inputSchema.properties as any).preset.enum).toContain('veryslow');
    expect((byName.render_video.inputSchema.properties as any).waitSeconds).toMatchObject({ default: 45, minimum: 0, maximum: 100 });
  });

  it('serves the player view with the seek shim injected as a safe string literal', async () => {
    await connect();
    const { resources } = await client.listResources();
    const listed = resources.find((r) => r.uri === PLAYER_URI)!;
    const meta = {
      ui: {
        csp: {
          resourceDomains: [
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
          ],
        },
        prefersBorder: false,
      },
    };
    expect(listed).toMatchObject({ mimeType: 'text/html;profile=mcp-app', _meta: meta });

    const { contents } = await client.readResource({ uri: PLAYER_URI });
    expect(contents).toHaveLength(1);
    const item = contents[0] as any;
    expect(item.uri).toBe(PLAYER_URI);
    expect(item.mimeType).toBe('text/html;profile=mcp-app');
    expect(item._meta).toEqual(meta);
    expect(item.text).not.toContain('__HELIOS_PAGE_SHIM__');

    const literal = /const PAGE_SHIM = ("(?:[^"\\]|\\.)*");/.exec(item.text)![1];
    expect(literal).not.toContain('<');
    expect(JSON.parse(literal)).toBe(SHIM);
    // The only closing script tag is the view's own.
    expect(item.text.match(/<\/script/g)).toHaveLength(1);
  });

  it('retries reading the view after a failure instead of caching it', async () => {
    fs.rmSync(path.join(tmp, 'player.html'));
    await connect();
    await expect(client.readResource({ uri: PLAYER_URI })).rejects.toThrow();
    fs.writeFileSync(path.join(tmp, 'player.html'), VIEW);
    const { contents } = await client.readResource({ uri: PLAYER_URI });
    expect((contents[0] as any).text).toContain('const PAGE_SHIM = "');
  });
});

describe('helios MCP server: preview, library, pages', () => {
  it('preview_video returns the player state for a page in the root', async () => {
    write('videos/intro.html', '<html></html>');
    await connect();

    const result = await call('preview_video', { path: 'videos/intro.html', duration: 12 });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      mode: 'player', path: 'videos/intro.html', duration: 12, width: 1920, height: 1080, fps: 30,
    });
    expect(result.content[0].text).toBe(
      'Previewing videos/intro.html (12 s, 1920×1080) in the conversation. ' +
      'The person can scrub it and select a moment or an element; their selection reaches you as context.',
    );

    const sized = await call('preview_video', { path: './videos/../videos/intro.html', width: 640, height: 360, fps: 24 });
    expect(sized.structuredContent).toEqual({ mode: 'player', path: 'videos/intro.html', duration: null, width: 640, height: 360, fps: 24 });
  });

  it('preview_video rejects paths outside the root, missing files and folders', async () => {
    fs.writeFileSync(path.join(tmp, 'outside.html'), '<html></html>');
    fs.symlinkSync(path.join(tmp, 'outside.html'), path.join(root, 'sneaky.html'));
    write('dir/a.html');
    await connect();

    for (const [input, message] of [
      ['../outside.html', 'outside the project root'],
      [path.join(tmp, 'outside.html'), 'outside the project root'],
      ['sneaky.html', 'resolves outside the project root'],
      ['missing.html', 'was not found'],
      ['dir', 'is not a file'],
    ] as const) {
      const result = await call('preview_video', { path: input });
      expect(result.isError, input).toBe(true);
      expect(result.content[0].text, input).toContain(message);
    }
  });

  it('preview_video saves html to path first, for hosts that cannot write files', async () => {
    await connect();
    const html = '<!doctype html><html><body><script>window.renderAt = () => {};</script></body></html>';

    const result = await call('preview_video', { path: 'new/clip.html', html, duration: 3 });
    expect(result.isError).toBeFalsy();
    expect(fs.readFileSync(path.join(root, 'new/clip.html'), 'utf8')).toBe(html);
    expect(result.structuredContent).toMatchObject({ mode: 'player', path: 'new/clip.html', duration: 3 });
    expect(result.content[0].text).toMatch(/^Saved new\/clip\.html\. Previewing new\/clip\.html \(3 s/);

    const replaced = await call('preview_video', { path: 'new/clip.html', html: '<html>v2</html>' });
    expect(replaced.isError).toBeFalsy();
    expect(fs.readFileSync(path.join(root, 'new/clip.html'), 'utf8')).toBe('<html>v2</html>');
  });

  it('preview_video only saves html inside the root, to .html files', async () => {
    await connect();
    for (const [input, message] of [
      ['../escape.html', 'outside the project root'],
      ['notes.txt', 'must end in .html'],
    ] as const) {
      const result = await call('preview_video', { path: input, html: '<html></html>' });
      expect(result.isError, input).toBe(true);
      expect(result.content[0].text, input).toContain(message);
    }
    expect(fs.existsSync(path.join(tmp, 'escape.html'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'notes.txt'))).toBe(false);
  });

  it('reveal_file shows or opens renders and pages inside the root, nothing else', async () => {
    write('out/clip.mp4', 'x');
    write('page.html');
    write('secrets.env', 'x');
    await connect();

    expect((await call('reveal_file', { path: 'out/clip.mp4' })).isError).toBeFalsy();
    expect((await call('reveal_file', { path: 'page.html', open: true })).isError).toBeFalsy();
    expect(revealed).toEqual([
      { path: path.join(root, 'out/clip.mp4'), open: false },
      { path: path.join(root, 'page.html'), open: true },
    ]);

    for (const [input, message] of [
      ['../outside.mp4', 'outside the project root'],
      ['secrets.env', 'Only videos, images and pages'],
      ['missing.mp4', 'was not found'],
    ] as const) {
      const result = await call('reveal_file', { path: input });
      expect(result.isError, input).toBe(true);
      expect(result.content[0].text, input).toContain(message);
    }
    expect(revealed).toHaveLength(2);
  });

  it('rejects invalid arguments as tool errors', async () => {
    write('a.html');
    await connect();
    const result = await call('preview_video', { path: 'a.html', duration: -1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Input validation error/);
  });

  it('helios_library opens the library', async () => {
    await connect();
    const result = await call('helios_library', {});
    expect(result.structuredContent).toEqual({ mode: 'library' });
    expect(result.content).toEqual([{ type: 'text', text: 'Opened the Helios library.' }]);
  });

  it('read_page returns the page with local files inlined', async () => {
    write('v/logo.png', Buffer.from([1, 2, 3]));
    write('v/index.html', '<head></head><img src="logo.png"><script src="https://unpkg.com/x.js"></script>');
    await connect();

    const result = await call('read_page', { path: 'v/index.html' });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.path).toBe('v/index.html');
    expect(result.structuredContent.html).toContain('<img src="data:image/png;base64,AQID">');
    expect(result.structuredContent.inlined).toEqual(['v/logo.png']);
    expect(result.structuredContent.skipped).toHaveLength(1);
    expect(result.content[0].text).toMatch(/^Read v\/index\.html \(.*, 1 files inlined, 1 skipped\)\.$/);

    const outside = await call('read_page', { path: '../player.html' });
    expect(outside.isError).toBe(true);
  });

  it('list_videos lists pages and renders newest first, skipping dependency, build and dot folders', async () => {
    const at = (rel: string, seconds: number, content = '') => {
      const file = write(rel, content);
      const time = new Date(1_700_000_000_000 + seconds * 1000);
      fs.utimesSync(file, time, time);
    };
    at('old.html', 1);
    at('new.html', 3);
    at('a/b/c/deep.html', 2);
    at('a/b/c/d/too-deep.html', 4);
    at('node_modules/pkg/index.html', 5);
    at('dist/index.html', 5);
    at('.cache/x.html', 5);
    at('out/clip.mp4', 6, '12345');
    at('notes.txt', 7);
    fs.symlinkSync(tmp, path.join(root, 'loop'));
    await connect();

    const result = await call('list_videos', {});
    expect(result.structuredContent).toEqual({
      root,
      pages: [
        { path: 'new.html', modifiedMs: 1_700_000_003_000 },
        { path: 'a/b/c/deep.html', modifiedMs: 1_700_000_002_000 },
        { path: 'old.html', modifiedMs: 1_700_000_001_000 },
      ],
      renders: [{ path: 'out/clip.mp4', bytes: 5, modifiedMs: 1_700_000_006_000 }],
    });
  });
});

describe('helios MCP server: rendering', () => {
  it('maps render_video arguments to the CLI flags and reports completion', async () => {
    write('v/intro.html', '<html></html>');
    write('music/song.mp3', 'x');
    const fake = fakeRunner((c) => {
      c.out('Initializing renderer...\nProgress: Rendered 30 / 60 frames\n');
      write('renders/final.mp4', Buffer.alloc(2048));
      c.out('Render complete.\n');
      c.exit(0);
    });
    await connect(fake.runner);

    const result = await call('render_video', {
      path: 'v/intro.html',
      output: 'renders/final.mp4',
      duration: 2,
      width: 320,
      height: 180,
      fps: 24,
      audio: 'music/song.mp3',
      preset: 'medium',
      mode: 'canvas',
      waitSeconds: 5,
    });

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].cwd).toBe(root);
    expect(fake.calls[0].args).toEqual([
      'render', path.join(root, 'v/intro.html'),
      '-o', path.join(root, 'renders/final.mp4'),
      '--duration', '2',
      '--width', '320',
      '--height', '180',
      '--fps', '24',
      '--audio', path.join(root, 'music/song.mp3'),
      '--preset', 'medium',
      '--mode', 'canvas',
    ]);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      status: 'completed',
      output: 'renders/final.mp4',
      absoluteOutput: path.join(root, 'renders/final.mp4'),
      progress: 1,
      bytes: 2048,
    });
    expect(result.content[0].text).toContain(`It is at ${path.join(root, 'renders/final.mp4')}`);
    expect(result.structuredContent.jobId).toMatch(/^render-/);
    expect(result.structuredContent.logTail).toEqual([
      'Initializing renderer...', 'Progress: Rendered 30 / 60 frames', 'Render complete.',
    ]);
    expect(result.content[0].text).toMatch(/^Rendered renders\/final\.mp4 \(2\.0 s requested, 2\.0 KB\) in \d+ s\. It is at \//);
  });

  it('defaults the output to the page name next to the page and passes no optional flags', async () => {
    write('v/intro.html');
    const fake = fakeRunner();
    await connect(fake.runner);
    const result = await call('render_video', { path: 'v/intro.html', waitSeconds: 0 });
    expect(fake.calls[0].args).toEqual(['render', path.join(root, 'v/intro.html'), '-o', path.join(root, 'v/intro.mp4')]);
    expect(result.structuredContent).toMatchObject({ status: 'running', output: 'v/intro.mp4', progress: null });
    fake.calls[0].exit(1);
  });

  it('rejects outputs and audio outside the root before starting anything', async () => {
    write('a.html');
    fs.writeFileSync(path.join(tmp, 'song.mp3'), 'x');
    const fake = fakeRunner();
    await connect(fake.runner);

    for (const args of [
      { path: 'a.html', output: '../out.mp4' },
      { path: 'a.html', output: path.join(tmp, 'out.mp4') },
      { path: 'a.html', audio: '../song.mp3' },
      { path: 'a.html', output: 'a.html' },
    ]) {
      const result = await call('render_video', { ...args, waitSeconds: 0 });
      expect(result.isError, JSON.stringify(args)).toBe(true);
    }
    expect(fake.calls).toHaveLength(0);
  });

  it('returns running after waitSeconds, then completes through get_render_status with progress', async () => {
    write('a.html');
    const fake = fakeRunner((c) => c.out('Progress: Rendered 0 / 100 frames\n'));
    await connect(fake.runner);

    const started = await call('render_video', { path: 'a.html', duration: 4, waitSeconds: 0.05 });
    expect(started.structuredContent).toMatchObject({ status: 'running', output: 'a.mp4', progress: 0 });
    const jobId = started.structuredContent.jobId;
    expect(started.content[0].text).toBe(`Still rendering a.mp4 (0%). Call get_render_status with jobId "${jobId}" to wait for it.`);

    const progress: number[] = [];
    const pending = call('get_render_status', { jobId, waitSeconds: 5 }, { onprogress: (p) => progress.push(p.progress) });
    await tick();
    fake.calls[0].out('Progress: Rendered 42 / 100 frames\n');
    await tick();
    fake.calls[0].out('Progress: Rendered 99 / 100 frames\n');
    write('a.mp4', Buffer.alloc(10));
    fake.calls[0].exit(0);

    const done = await pending;
    expect(done.structuredContent).toMatchObject({ jobId, status: 'completed', progress: 1, bytes: 10 });
    expect(progress).toEqual([0, 42, 99, 100]);
  });

  it('reports the progress percentage while still running', async () => {
    write('a.html');
    const fake = fakeRunner((c) => c.out('Progress: Rendered 42 / 100 frames\n'));
    await connect(fake.runner);
    const started = await call('render_video', { path: 'a.html', waitSeconds: 0.05 });
    expect(started.structuredContent.progress).toBe(0.42);
    expect(started.content[0].text).toContain('Still rendering a.mp4 (42%)');
    fake.calls[0].exit(1);
  });

  it('cancel_render kills the render: SIGTERM, then SIGKILL after the grace period', async () => {
    write('a.html');
    const fake = fakeRunner();
    await connect(fake.runner);
    const started = await call('render_video', { path: 'a.html', waitSeconds: 0 });
    const jobId = started.structuredContent.jobId;

    const waiting = call('get_render_status', { jobId, waitSeconds: 10 });
    await tick();
    const cancelled = await call('cancel_render', { jobId });
    expect(cancelled.structuredContent).toMatchObject({ jobId, status: 'cancelled' });
    expect(cancelled.content[0].text).toBe('Cancelled the render of a.mp4.');
    expect(fake.calls[0].signals).toEqual(['SIGTERM']);
    // A waiting status call returns as soon as the job is cancelled.
    expect((await waiting).structuredContent.status).toBe('cancelled');

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(fake.calls[0].signals).toEqual(['SIGTERM', 'SIGKILL']);
    fake.calls[0].exit(null, 'SIGKILL');
    await tick();
    const status = await call('get_render_status', { jobId, waitSeconds: 0 });
    expect(status.structuredContent.status).toBe('cancelled');
  });

  it('reports a failed render with the CLI error', async () => {
    write('a.html');
    const fake = fakeRunner((c) => {
      c.out('Initializing renderer...\n');
      c.err('Render failed: How long should the video be? Pass --duration <seconds>: it defines no window.helios or window.renderAt(t).\n');
      c.exit(1);
    });
    await connect(fake.runner);
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      status: 'failed',
      error: 'How long should the video be? Pass --duration <seconds>: it defines no window.helios or window.renderAt(t).',
    });
    expect(result.content[0].text).toMatch(/^Render of a\.mp4 failed: How long/);
  });

  it('allows two renders at a time and names the running jobs on a third', async () => {
    write('a.html');
    write('b.html');
    write('c.html');
    const fake = fakeRunner();
    await connect(fake.runner);
    const first = await call('render_video', { path: 'a.html', waitSeconds: 0 });
    const second = await call('render_video', { path: 'b.html', waitSeconds: 0 });
    const third = await call('render_video', { path: 'c.html', waitSeconds: 0 });
    expect(third.isError).toBe(true);
    expect(third.content[0].text).toContain('A render is already running');
    expect(third.content[0].text).toContain(first.structuredContent.jobId);
    expect(third.content[0].text).toContain(second.structuredContent.jobId);
    expect(fake.calls).toHaveLength(2);

    fake.calls[0].exit(1);
    await tick();
    const fourth = await call('render_video', { path: 'c.html', waitSeconds: 0 });
    expect(fourth.structuredContent.status).toBe('running');
    fake.calls[1].exit(1);
    fake.calls[2].exit(1);
  });

  it('refuses a second render to the same output while the first runs', async () => {
    write('a.html');
    const fake = fakeRunner();
    await connect(fake.runner);
    await call('render_video', { path: 'a.html', waitSeconds: 0 });
    const again = await call('render_video', { path: 'a.html', waitSeconds: 0 });
    expect(again.isError).toBe(true);
    expect(again.content[0].text).toContain('A render to a.mp4 is still running');
    fake.calls[0].exit(1);
  });

  it('get_render_status and cancel_render reject unknown jobs', async () => {
    await connect();
    expect((await call('get_render_status', { jobId: 'render-nope' })).isError).toBe(true);
    expect((await call('cancel_render', { jobId: 'render-nope' })).isError).toBe(true);
  });
});

describe('helios MCP server: frames and verify', () => {
  it('get_frames runs helios sheet with --at and returns the PNG', async () => {
    write('v/a.html');
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9]);
    let sheetDir = '';
    const fake = fakeRunner((c) => {
      const out = c.args[c.args.indexOf('-o') + 1];
      sheetDir = path.dirname(out);
      fs.writeFileSync(out, png);
      c.exit(0);
    });
    await connect(fake.runner);

    const result = await call('get_frames', { path: 'v/a.html', at: [0, 1.5, 3], width: 640, height: 360, crop: '10, 20,300,200' });

    const args = fake.calls[0].args;
    expect(args[0]).toBe('sheet');
    expect(args[1]).toBe(path.join(root, 'v/a.html'));
    expect(args[2]).toBe('-o');
    expect(path.basename(args[3])).toBe('sheet.png');
    expect(args.slice(4)).toEqual(['--at', '0,1.5,3', '--cell-width', '640', '--width', '640', '--height', '360', '--crop', '10,20,300,200']);
    expect(fake.calls[0].cwd).toBe(root);

    expect(result.isError).toBeFalsy();
    expect(result.content).toEqual([
      { type: 'text', text: 'Contact sheet of v/a.html at 0, 1.5, 3 s; each frame is labelled with its time.' },
      { type: 'image', data: png.toString('base64'), mimeType: 'image/png' },
    ]);
    // The temporary folder is gone.
    expect(fs.existsSync(sheetDir)).toBe(false);
  });

  it('get_frames passes --every and --duration when no times are given', async () => {
    write('a.html');
    const fake = fakeRunner((c) => {
      fs.writeFileSync(c.args[c.args.indexOf('-o') + 1], Buffer.from([1]));
      c.out('Wrote sheet.png (4 frames: 0s, 0.5s, 1s, 1.5s)\n');
      c.exit(0);
    });
    await connect(fake.runner);
    const result = await call('get_frames', { path: 'a.html', every: 0.5, duration: 2, cellWidth: 320 });
    expect(fake.calls[0].args.slice(4)).toEqual(['--every', '0.5', '--duration', '2', '--cell-width', '320']);
    expect(result.content[0].text).toBe('Contact sheet of a.html: 4 frames at 0s, 0.5s, 1s, 1.5s; each frame is labelled with its time.');
  });

  it('get_frames turns a CLI failure into a tool error and cleans up', async () => {
    write('a.html');
    let sheetDir = '';
    const fake = fakeRunner((c) => {
      sheetDir = path.dirname(c.args[c.args.indexOf('-o') + 1]);
      c.err('Sheet failed: The page declares no duration: pass --duration <seconds>, or pick frames with --at or --strip\n');
      c.exit(1);
    });
    await connect(fake.runner);
    const result = await call('get_frames', { path: 'a.html' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Could not render frames of a.html: The page declares no duration: pass --duration <seconds>, or pick frames with --at or --strip');
    expect(fs.existsSync(sheetDir)).toBe(false);
  });

  it('get_frames validates its arguments', async () => {
    write('a.html');
    const fake = fakeRunner();
    await connect(fake.runner);
    expect((await call('get_frames', { path: 'a.html', at: [] })).isError).toBe(true);
    expect((await call('get_frames', { path: 'a.html', at: Array.from({ length: 25 }, (_, i) => i) })).isError).toBe(true);
    expect((await call('get_frames', { path: 'a.html', crop: '1,2,3' })).isError).toBe(true);
    expect(fake.calls).toHaveLength(0);
  });

  it('verify_video passes the CLI message through when frames match', async () => {
    write('a.html');
    const message = '6 sampled frames are identical rendered in order and in reverse: each frame depends only on t.';
    const fake = fakeRunner((c) => { c.out(`Initializing...\n${message}\n`); c.exit(0); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html', duration: 3, samples: 8 });
    expect(fake.calls[0].args).toEqual(['verify', path.join(root, 'a.html'), '--duration', '3', '--samples', '8']);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ ok: true, message });
    expect(result.content[0].text).toBe(message);
  });

  it('verify_video reports differing frames as a result, not a tool error', async () => {
    write('a.html');
    const message = 'Frames at 1s, 2s differ depending on what was rendered before them. Every frame must be a function of t alone.';
    const fake = fakeRunner((c) => { c.err(`Verify failed: ${message}\n`); c.exit(1); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html' });
    expect(fake.calls[0].args).toEqual(['verify', path.join(root, 'a.html')]);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ ok: false, message });
  });

  it('verify_video turns a crash into a tool error', async () => {
    write('a.html');
    const fake = fakeRunner((c) => { c.err('Verify failed: The page declares no duration: pass --duration <seconds>\n'); c.exit(1); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Could not verify a.html: The page declares no duration: pass --duration <seconds>');
  });
});
