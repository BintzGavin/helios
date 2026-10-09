import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv2020 from 'ajv/dist/2020.js';
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

/** What `helios check --json` prints for a clean render. */
const CHECK_PASS = {
  ok: true,
  file: 'a.mp4',
  video: {
    codec: 'h264', width: 1920, height: 1080, fps: 30, duration: 4, frames: 120, pixFmt: 'yuv420p',
    color: { matrix: 'bt709', primaries: 'bt709', transfer: 'bt709', range: 'tv' },
  },
  audio: null,
  flash: { ok: true, maxPerSecond: 1, worst: { t0: 3, t1: 4, count: 1 }, red: false },
  problems: [],
  warnings: [],
};

/** Answers a `helios check` call with a passing report. */
function passCheck(c: FakeCall) {
  c.out(`${JSON.stringify(CHECK_PASS, null, 2)}\n`);
  c.exit(0);
}

/** A fake runner that sends `helios check` calls to onCheck and everything else to onCall. */
function renderRunner(onCall: (call: FakeCall) => void = () => {}, onCheck: (call: FakeCall) => void = passCheck) {
  return fakeRunner((c) => (c.args[0] === 'check' ? onCheck(c) : onCall(c)));
}

const SHIM = 'window.__shim = "</script><img src=x>";';
const VIEW = '<!doctype html><html><body><script>const PAGE_SHIM = "__HELIOS_PAGE_SHIM__";</script></body></html>';

let tmp: string;
let root: string;
let helios: HeliosMcp;
let client: Client;

let revealed: Array<{ path: string; open: boolean }>;

async function connect(runner: CliRunner = fakeRunner().runner, options: { checkWaitMs?: number } = {}) {
  revealed = [];
  helios = createHeliosMcpServer({
    root,
    runner,
    reveal: async (absPath, open) => { revealed.push({ path: absPath, open }); },
    viewPath: path.join(tmp, 'player.html'),
    buildShim: () => SHIM,
    version: '9.9.9',
    killGraceMs: 50,
    checkWaitMs: 2000,
    ...options,
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

  it('lists schemas that a JSON Schema 2020-12 validator accepts, as Claude validates them', async () => {
    write('a.html', '<html></html>');
    await connect();
    const ajv = new Ajv2020({ strict: false });
    const { tools } = await client.listTools();
    const validators = Object.fromEntries(tools.map((tool) => {
      ajv.compile(tool.inputSchema);
      return [tool.name, tool.outputSchema ? ajv.compile(tool.outputSchema) : undefined];
    }));
    for (const [name, args] of [
      ['preview_video', { path: 'a.html', duration: 2 }], ['helios_library', {}], ['list_videos', {}], ['read_page', { path: 'a.html' }],
    ] as const) {
      const result = await call(name, args);
      expect(validators[name]!(result.structuredContent), `${name}: ${JSON.stringify(validators[name]!.errors)}`).toBe(true);
    }
  });

  it('lists the eleven tools with their view and visibility metadata', async () => {
    await connect();
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(Object.keys(byName).sort()).toEqual([
      'analyze_audio', 'cancel_render', 'get_frames', 'get_render_status', 'helios_library', 'list_videos',
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
    for (const name of ['get_frames', 'verify_video', 'analyze_audio']) {
      expect(byName[name]._meta).toBeUndefined();
    }

    expect(byName.preview_video.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    for (const name of ['helios_library', 'read_page', 'list_videos', 'get_frames', 'verify_video', 'get_render_status']) {
      expect(byName[name].annotations?.readOnlyHint, name).toBe(true);
    }
    expect(byName.render_video.annotations).toMatchObject({ readOnlyHint: false, idempotentHint: false });
    // It writes the beats file, always the same one for the same audio.
    expect(byName.analyze_audio.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    expect((byName.verify_video.inputSchema.properties as any).cues).toMatchObject({ type: 'string' });
    expect((byName.render_video.outputSchema!.properties as any).checks).toBeDefined();
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
      mode: 'player', path: 'videos/intro.html', absolutePath: path.join(root, 'videos/intro.html'),
      duration: 12, width: 1920, height: 1080, fps: 30,
    });
    expect(result.content[0].text).toBe(
      'Previewing videos/intro.html (12 s, 1920×1080) in the conversation. ' +
      `The page is at ${path.join(root, 'videos/intro.html')}. ` +
      'The person can scrub it and select a moment or an element; their selection reaches you as context.',
    );

    const sized = await call('preview_video', { path: './videos/../videos/intro.html', width: 640, height: 360, fps: 24 });
    expect(sized.structuredContent).toEqual({
      mode: 'player', path: 'videos/intro.html', absolutePath: path.join(root, 'videos/intro.html'),
      duration: null, width: 640, height: 360, fps: 24,
    });
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
    const fake = renderRunner((c) => {
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

    expect(fake.calls).toHaveLength(2);
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
    // The log is only for failures; on success it would be encoder noise in the model's context.
    expect(result.structuredContent.logTail).toBeUndefined();
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
    const fake = renderRunner((c) => c.out('Progress: Rendered 0 / 100 frames\n'));
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
    // Only a finished MP4 is checked.
    expect(fake.calls).toHaveLength(1);
    expect(result.structuredContent.checks).toBeUndefined();
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

  it('verify_video passes a plain-text success line through when the CLI prints no JSON', async () => {
    write('a.html');
    const message = '6 sampled frames are identical rendered in order and in reverse: each frame depends only on t.';
    const fake = fakeRunner((c) => { c.out(`Initializing...\n${message}\n`); c.exit(0); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html', duration: 3, samples: 8 });
    expect(fake.calls[0].args).toEqual(['verify', path.join(root, 'a.html'), '--duration', '3', '--samples', '8', '--json']);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ ok: true, message });
    expect(result.content[0].text).toBe(message);
  });

  it('verify_video reports differing frames from stderr as a result, not a tool error', async () => {
    write('a.html');
    const message = 'Frames at 1s, 2s differ depending on what was rendered before them. Every frame must be a function of t alone.';
    const fake = fakeRunner((c) => { c.err(`Verify failed: ${message}\n`); c.exit(1); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html' });
    expect(fake.calls[0].args).toEqual(['verify', path.join(root, 'a.html'), '--json']);
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

// ---- Prompts ------------------------------------------------------------------------------------

/** Words that would sell something inside the host, which AI hosts don't allow. */
const SALES_TALK = /price|pricing|upgrade|subscri|\$\d|paid|checkout|free plan|pro plan/i;

/** The numbered step n of a prompt's text. */
function step(text: string, n: number): string {
  return text.split('\n').find((line) => line.startsWith(`${n}. `)) ?? '';
}

describe('helios MCP server: prompts', () => {
  it('lists make_video and music_video with their arguments', async () => {
    await connect();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(['make_video', 'music_video']);
    const byName = Object.fromEntries(prompts.map((p) => [p.name, p]));
    expect(byName.make_video.title).toBe('Make a video');
    expect(byName.make_video.arguments!.map((a) => [a.name, a.required])).toEqual([
      ['brief', true], ['duration', false], ['size', false],
    ]);
    expect(byName.music_video.title).toBe('Make a music video');
    expect(byName.music_video.arguments!.map((a) => [a.name, a.required])).toEqual([['audio', true], ['brief', true]]);
    for (const prompt of prompts) {
      expect(prompt.description, prompt.name).toBeTruthy();
      expect(prompt.description, prompt.name).not.toMatch(SALES_TALK);
      for (const arg of prompt.arguments ?? []) expect(arg.description, `${prompt.name}.${arg.name}`).toBeTruthy();
    }
  });

  it('make_video steers through writing the page, verify, frames, preview and render', async () => {
    await connect();
    const result = await client.getPrompt({
      name: 'make_video',
      arguments: { brief: 'A 3-step explainer for Acme Sync', duration: '15', size: '1080x1920' },
    });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    const text = (result.messages[0].content as any).text as string;
    expect(text).toContain('Brief: A 3-step explainer for Acme Sync\nLength in seconds: 15\nSize or aspect: 1080x1920\n');
    expect(text).toContain('window.renderAt(t)');
    expect(text).toContain('pure function of t');
    expect(text).toContain('never call Math.random() inside renderAt');
    expect(text).toContain('calls no generative model');
    expect(text).toContain('pass the page to preview_video as html');
    expect(step(text, 1)).toContain('window.renderAt(t)');
    expect(step(text, 2)).toContain('verify_video');
    expect(step(text, 3)).toContain('get_frames');
    expect(step(text, 4)).toContain('preview_video');
    expect(step(text, 5)).toMatch(/render_video.*get_render_status/);
    expect(text).not.toMatch(SALES_TALK);
  });

  it('make_video leaves out optional arguments that are missing or blank', async () => {
    await connect();
    const variants: Array<Record<string, string>> = [{ brief: 'A logo reveal' }, { brief: 'A logo reveal', duration: '', size: '  ' }];
    for (const args of variants) {
      const text = ((await client.getPrompt({ name: 'make_video', arguments: args })).messages[0].content as any).text as string;
      expect(text).toContain('Brief: A logo reveal\n\n');
      expect(text).not.toContain('Length in seconds');
      expect(text).not.toContain('Size or aspect');
    }
  });

  it('make_video requires a brief', async () => {
    await connect();
    await expect(client.getPrompt({ name: 'make_video', arguments: {} })).rejects.toThrow(/brief/);
  });

  it('music_video starts from analyze_audio, times words to their cues and checks them', async () => {
    await connect();
    const result = await client.getPrompt({
      name: 'music_video',
      arguments: { audio: 'music/song.mp3', brief: 'Neon type that hits on every chorus' },
    });
    const text = (result.messages[0].content as any).text as string;
    expect(text.split('\n')[0]).toBe('Make a music video with Helios for music/song.mp3.');
    expect(text).toContain('Brief: Neon type that hits on every chorus');
    expect(text).toContain('1. Run analyze_audio on music/song.mp3.');
    expect(text).toContain('Cut on downbeats and kicks, and land key moves on the hits');
    expect(text).toContain('Don\'t snap words to the beat');
    expect(text).toContain('pass their timed-text file as cues');
    expect(text).toContain('window.heliosDrawnText?.add(text)');
    expect(text).toContain('never more than three times in any one second (WCAG 2.3.1)');
    expect(text).toContain('render_video with audio music/song.mp3');
    expect(text).toContain('calls no generative model');
    expect(text).toContain('Helios doesn\'t transcribe');
    expect(step(text, 1)).toContain('analyze_audio');
    expect(step(text, 2)).toContain('window.renderAt(t)');
    expect(step(text, 3)).toContain('verify_video');
    expect(step(text, 4)).toContain('get_frames');
    expect(step(text, 5)).toMatch(/preview_video.*render_video.*get_render_status/);
    expect(text).not.toMatch(SALES_TALK);
  });
});

describe('Claude Desktop manifest', () => {
  const manifestPath = fileURLToPath(new URL('../../../../../integrations/claude-desktop/manifest.json', import.meta.url));

  it('lists every tool the model can call, and no app-only tool', async () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await connect();
    const { tools } = await client.listTools();
    const modelTools = tools.filter((tool) => !(tool._meta as any)?.ui?.visibility?.length || (tool._meta as any).ui.visibility.includes('model'));
    expect(manifest.tools.map((t: any) => t.name).sort()).toEqual(modelTools.map((t) => t.name).sort());
    for (const tool of manifest.tools) expect(tool.description, tool.name).toBeTruthy();
  });

  it('declares the prompts with the same arguments and text the server returns', async () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await connect();
    const { prompts } = await client.listPrompts();
    expect(manifest.prompts.map((p: any) => p.name)).toEqual(prompts.map((p) => p.name));
    for (const declared of manifest.prompts) {
      const served = prompts.find((p) => p.name === declared.name)!;
      expect(declared.arguments, declared.name).toEqual(served.arguments!.map((a) => a.name));
      expect(declared.description, declared.name).toBe(served.description);
      // The manifest's text is the prompt with every argument as an MCPB ${arguments.x} placeholder.
      const placeholders = Object.fromEntries(declared.arguments.map((name: string) => [name, `\${arguments.${name}}`]));
      const result = await client.getPrompt({ name: declared.name, arguments: placeholders });
      expect(declared.text, declared.name).toBe((result.messages[0].content as any).text);
    }
  });
});

// ---- analyze_audio -----------------------------------------------------------------------------

const BEATS = {
  version: 1,
  source: 'song.mp3',
  duration: 12.5,
  bpm: 120.04,
  tempo: [{ t: 0, bpm: 119.5 }, { t: 5, bpm: 120.04 }, { t: 10, bpm: 121.26 }],
  beatsPerBar: 4,
  beats: Array.from({ length: 24 }, (_, i) => 0.5 + i * 0.5),
  downbeats: [0.5, 2.5, 4.5, 6.5, 8.5, 10.5],
  downbeatMethod: 'kick',
  sections: [{ t0: 0, t1: 4.5, energy: 0.312 }, { t0: 4.5, t1: 12.5, energy: 0.8 }],
  hits: [
    { t: 1, score: 0.3 }, { t: 2.5, score: 0.9 }, { t: 3, score: 0.25 }, { t: 4.5, score: 0.7 }, { t: 5, score: 0.2 },
    { t: 6.5, score: 0.6 }, { t: 7, score: 0.5 }, { t: 8.5, score: 0.85 }, { t: 9, score: 0.4 }, { t: 10.5, score: 0.95 },
  ],
  onsets: { kick: [0.5, 1.5], snare: [1, 2], hat: [0.75] },
  risers: [{ t0: 9.5, t1: 10.5 }],
  envelope: { fps: 30, level: [0, 0.5, 1], low: [0, 0.4, 1], mid: [0, 0.2, 0.5], high: [0, 0.1, 0.3] },
};

/** Plays `helios analyze`: writes the beats file to -o and prints the summary line. */
function analyzeRunner(beats: unknown = BEATS) {
  return fakeRunner((c) => {
    fs.writeFileSync(c.args[c.args.indexOf('-o') + 1], JSON.stringify(beats));
    c.out('Wrote song.beats.json: 120.0 BPM (119.5–121.3), 24 beats, 6 bars, 10 hits, 2 sections\n');
    c.exit(0);
  });
}

describe('helios MCP server: analyze_audio', () => {
  it('runs helios analyze into <audio>.beats.json next to the audio and summarises the file', async () => {
    write('music/song.mp3', 'x');
    const fake = analyzeRunner();
    await connect(fake.runner);

    const result = await call('analyze_audio', { path: 'music/song.mp3' });
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].cwd).toBe(root);
    expect(fake.calls[0].args).toEqual([
      'analyze', path.join(root, 'music/song.mp3'), '-o', path.join(root, 'music/song.beats.json'),
    ]);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe([
      'Analyzed music/song.mp3 (12.5 s) and wrote music/song.beats.json.',
      'Tempo: 120 BPM, drifting 119.5–121.3: time things from the beats array, not a fixed grid.',
      '24 beats in 6 bars of 4; the first downbeat is at 0.5 s (chosen by the kick vote).',
      'Sections, in seconds (energy 0–1): 0–4.5 (0.31), 4.5–12.5 (0.8).',
      'Strongest hits, in seconds (score): 1 (0.3), 2.5 (0.9), 4.5 (0.7), 6.5 (0.6), 7 (0.5), 8.5 (0.85), 9 (0.4), 10.5 (0.95).',
      'In the page, load it with fetch() by its path relative to the page, e.g. fetch(\'song.beats.json\') from a page in the same folder. ' +
        'Every time in it is in seconds of song time; bar k starts at downbeats[k].',
    ].join('\n'));
    expect(result.structuredContent).toEqual({
      audio: 'music/song.mp3',
      path: 'music/song.beats.json',
      absolutePath: path.join(root, 'music/song.beats.json'),
      duration: 12.5,
      bpm: 120,
      tempoRange: { min: 119.5, max: 121.3 },
      beats: 24,
      bars: 6,
      beatsPerBar: 4,
      firstDownbeat: 0.5,
      downbeatMethod: 'kick',
      sections: [{ t0: 0, t1: 4.5, energy: 0.31 }, { t0: 4.5, t1: 12.5, energy: 0.8 }],
      // The eight strongest, in time order: 3 s (0.25) and 5 s (0.2) are left out.
      hits: [
        { t: 1, score: 0.3 }, { t: 2.5, score: 0.9 }, { t: 4.5, score: 0.7 }, { t: 6.5, score: 0.6 },
        { t: 7, score: 0.5 }, { t: 8.5, score: 0.85 }, { t: 9, score: 0.4 }, { t: 10.5, score: 0.95 },
      ],
    });
  });

  it('passes output, fps and tempoRange to the CLI and creates the output folder', async () => {
    write('song.wav', 'x');
    const fake = analyzeRunner();
    await connect(fake.runner);
    const result = await call('analyze_audio', { path: 'song.wav', output: 'video/beats/song.json', fps: 24, tempoRange: ' 120 : 140 ' });
    expect(fake.calls[0].args).toEqual([
      'analyze', path.join(root, 'song.wav'), '-o', path.join(root, 'video/beats/song.json'), '--fps', '24', '--tempo-range', '120:140',
    ]);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.path).toBe('video/beats/song.json');
    expect(result.content[0].text).toContain('fetch(\'song.json\')');
  });

  it('describes a steady tempo and a file without downbeats, sections or hits', async () => {
    write('click.wav', 'x');
    const fake = analyzeRunner({ version: 1, bpm: 100, tempo: [{ t: 0, bpm: 100 }], beats: [0, 0.6, 1.2], downbeats: [] });
    await connect(fake.runner);
    const result = await call('analyze_audio', { path: 'click.wav' });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text.split('\n').slice(0, 3)).toEqual([
      'Analyzed click.wav and wrote click.beats.json.',
      'Tempo: 100 BPM.',
      '3 beats; no downbeats were found.',
    ]);
    expect(result.structuredContent).toMatchObject({ duration: null, bars: 0, firstDownbeat: null, sections: [], hits: [] });
  });

  it('rejects audio and outputs outside the root, and outputs that are not .json, before running anything', async () => {
    write('song.mp3', 'x');
    write('page.html', '<html></html>');
    fs.writeFileSync(path.join(tmp, 'outside.mp3'), 'x');
    const fake = analyzeRunner();
    await connect(fake.runner);
    for (const [args, message] of [
      [{ path: '../outside.mp3' }, 'outside the project root'],
      [{ path: 'missing.mp3' }, 'was not found'],
      [{ path: 'song.mp3', output: '../beats.json' }, 'outside the project root'],
      [{ path: 'song.mp3', output: 'page.html' }, 'must be a .json file'],
      [{ path: 'song.mp3', tempoRange: 'fast' }, 'min:max'],
    ] as const) {
      const result = await call('analyze_audio', args);
      expect(result.isError, JSON.stringify(args)).toBe(true);
      expect(result.content[0].text, JSON.stringify(args)).toContain(message);
    }
    expect(fake.calls).toHaveLength(0);
    expect(fs.readFileSync(path.join(root, 'page.html'), 'utf8')).toBe('<html></html>');
  });

  it('turns a failed analysis or a missing or broken beats file into a tool error', async () => {
    write('song.mp3', 'x');
    await connect(fakeRunner((c) => { c.err('Analyze failed: song.mp3 has no audio stream\n'); c.exit(1); }).runner);
    const failed = await call('analyze_audio', { path: 'song.mp3' });
    expect(failed.isError).toBe(true);
    expect(failed.content[0].text).toBe('Could not analyze song.mp3: song.mp3 has no audio stream');
    await client.close();

    await connect(fakeRunner((c) => c.exit(0)).runner);
    const missing = await call('analyze_audio', { path: 'song.mp3' });
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toBe('helios analyze finished but wrote no beats file at song.beats.json');
    await client.close();

    await connect(analyzeRunner({ version: 1, beats: 'none' }).runner);
    const broken = await call('analyze_audio', { path: 'song.mp3' });
    expect(broken.isError).toBe(true);
    expect(broken.content[0].text).toContain('song.beats.json is not a Helios beats file');
  });
});

// ---- verify_video with cues and JSON ---------------------------------------------------------------

const PURE = '6 sampled frames are identical rendered in order and in reverse: each frame depends only on t.';

describe('helios MCP server: verify_video with timed text', () => {
  it('passes --cues and --json and reports both checks', async () => {
    write('v/a.html');
    write('v/lyrics.srt', '1\n00:00:01,000 --> 00:00:02,000\nhello\n');
    const report = {
      ok: true,
      purity: { ok: true, samples: 6, differing: [], noisy: [], message: PURE },
      cues: { ok: true, total: 3, shown: 3, missing: [], message: '3/3 cues on screen at their time.' },
    };
    // Something logged before the JSON doesn't stop it being read.
    const fake = fakeRunner((c) => { c.out(`Initializing...\n${JSON.stringify(report, null, 2)}\n`); c.exit(0); });
    await connect(fake.runner);

    const result = await call('verify_video', { path: 'v/a.html', duration: 4, cues: 'v/lyrics.srt' });
    expect(fake.calls[0].args).toEqual([
      'verify', path.join(root, 'v/a.html'), '--duration', '4', '--cues', path.join(root, 'v/lyrics.srt'), '--json',
    ]);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe(`${PURE}\n3/3 cues on screen at their time.`);
    expect(result.structuredContent).toEqual({
      ok: true,
      message: `${PURE} 3/3 cues on screen at their time.`,
      purity: { ok: true, message: PURE, samples: 6, differing: [] },
      cues: { ok: true, message: '3/3 cues on screen at their time.', total: 3, shown: 3, missing: [] },
    });
  });

  it('reports cues that are not on screen as a result, with what the frame showed', async () => {
    write('a.html');
    write('words.json', '[]');
    const message = '3 of 417 cues are not on screen at their time: "gentlemen" (9.64–9.98 s), "and" (10.1–10.2 s), "x" (11–11.5 s)';
    const report = {
      ok: false,
      purity: { ok: true, samples: 6, differing: [], noisy: [], message: PURE },
      cues: {
        ok: false, total: 417, shown: 414, message,
        missing: [
          { text: 'gentlemen', start: 9.64, end: 9.98, seen: 'LADIES.' },
          { text: 'and', start: 10.1, end: 10.2, seen: '' },
          { text: 'x', start: 11, end: 11.5 },
        ],
      },
    };
    const fake = fakeRunner((c) => { c.out(JSON.stringify(report)); c.exit(1); });
    await connect(fake.runner);

    const result = await call('verify_video', { path: 'a.html', cues: 'words.json' });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.ok).toBe(false);
    expect(result.structuredContent.cues).toMatchObject({ ok: false, total: 417, shown: 414 });
    expect(result.structuredContent.cues.missing).toHaveLength(3);
    expect(result.content[0].text).toBe([
      PURE,
      message,
      '- "gentlemen" (9.64–9.98 s): the frame showed "LADIES.".',
      '- "and" (10.1–10.2 s): the frame showed no text.',
      'Show each cue for its whole time. A canvas page reports the text it draws with window.heliosDrawnText?.add(text).',
    ].join('\n'));
  });

  it('reports differing frames from the JSON as a result', async () => {
    write('a.html');
    const message = 'Frames at 1s, 2s differ depending on what was rendered before them. Every frame must be a function of t alone.';
    const report = { ok: false, purity: { ok: false, samples: 6, differing: [1, 2], noisy: [], message } };
    const fake = fakeRunner((c) => { c.out(JSON.stringify(report)); c.exit(1); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html' });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ ok: false, message, purity: { ok: false, message, samples: 6, differing: [1, 2] } });
    expect(result.content[0].text).toBe(message);
  });

  it('only takes .srt, .vtt or .json cues inside the root', async () => {
    write('a.html');
    write('notes.txt', 'x');
    fs.writeFileSync(path.join(tmp, 'outside.srt'), 'x');
    const fake = fakeRunner();
    await connect(fake.runner);
    for (const [cues, message] of [
      ['notes.txt', 'must be an .srt, .vtt or .json file'],
      ['../outside.srt', 'outside the project root'],
      ['missing.vtt', 'was not found'],
    ] as const) {
      const result = await call('verify_video', { path: 'a.html', cues });
      expect(result.isError, cues).toBe(true);
      expect(result.content[0].text, cues).toContain(message);
    }
    expect(fake.calls).toHaveLength(0);
  });

  it('turns a cue file the CLI cannot read into a tool error', async () => {
    write('a.html');
    write('bad.vtt', 'nope');
    const fake = fakeRunner((c) => { c.err('Verify failed: bad.vtt is not a WebVTT file: it must start with WEBVTT\n'); c.exit(1); });
    await connect(fake.runner);
    const result = await call('verify_video', { path: 'a.html', cues: 'bad.vtt' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Could not verify a.html: bad.vtt is not a WebVTT file: it must start with WEBVTT');
  });
});

// ---- Checks after a render --------------------------------------------------------------------------

/** A render that writes its output and finishes. */
function finishRender(c: FakeCall) {
  fs.writeFileSync(c.args[c.args.indexOf('-o') + 1], Buffer.alloc(10));
  c.exit(0);
}

describe('helios MCP server: checks after a render', () => {
  it('runs helios check once on the finished MP4 and adds its result', async () => {
    write('a.html');
    const fake = renderRunner(finishRender);
    await connect(fake.runner);

    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(fake.calls.map((c) => c.args)).toEqual([
      ['render', path.join(root, 'a.html'), '-o', path.join(root, 'a.mp4')],
      ['check', path.join(root, 'a.mp4'), '--json'],
    ]);
    expect(fake.calls[1].cwd).toBe(root);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/^Rendered a\.mp4 \(10 B\) in \d+ s\. It is at .*a\.mp4\nChecks: no flashing above WCAG 2\.3\.1; colour tagged BT\.709\.$/);
    expect(result.structuredContent).toMatchObject({ status: 'completed', bytes: 10 });
    expect(result.structuredContent.checks).toEqual({
      status: 'passed',
      message: 'Checks: no flashing above WCAG 2.3.1; colour tagged BT.709.',
      problems: [],
      warnings: [],
      flash: { ok: true, maxPerSecond: 1, worst: { t0: 3, t1: 4, count: 1 } },
    });

    // Later results reuse the same check.
    const jobId = result.structuredContent.jobId;
    const again = await call('get_render_status', { jobId, waitSeconds: 0 });
    expect(again.structuredContent.checks).toEqual(result.structuredContent.checks);
    expect(again.content[0].text).toContain('\nChecks: no flashing above WCAG 2.3.1; colour tagged BT.709.');
    expect(fake.calls).toHaveLength(2);
  });

  it('checks a render whose completion get_render_status sees, and not while it runs', async () => {
    write('a.html');
    const fake = renderRunner();
    await connect(fake.runner);
    const started = await call('render_video', { path: 'a.html', waitSeconds: 0 });
    expect(started.structuredContent.status).toBe('running');
    expect(started.structuredContent.checks).toBeUndefined();
    expect(started.content[0].text).not.toContain('Checks:');
    expect(fake.calls).toHaveLength(1);

    finishRender(fake.calls[0]);
    const done = await call('get_render_status', { jobId: started.structuredContent.jobId, waitSeconds: 5 });
    expect(done.structuredContent).toMatchObject({ status: 'completed', checks: { status: 'passed' } });
    expect(fake.calls.map((c) => c.args[0])).toEqual(['render', 'check']);
  });

  it('reports a failed check, and its warnings, in a successful render result', async () => {
    write('a.html');
    const problem = 'The video flashes 5 times in one second at 3–4 s, above the WCAG 2.3.1 limit of 3: slow the flashes or make them smaller.';
    const warning = 'The video has no color tags: players may show it washed out. Re-render with this Helios version.';
    const fake = renderRunner(finishRender, (c) => {
      c.out(JSON.stringify({
        ...CHECK_PASS,
        ok: false,
        video: { ...CHECK_PASS.video, color: { matrix: null, primaries: null, transfer: null, range: null } },
        flash: { ok: false, maxPerSecond: 5, worst: { t0: 3, t1: 4, count: 5 }, red: false },
        problems: [problem],
        warnings: [warning],
      }));
      c.exit(1);
    });
    await connect(fake.runner);
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.status).toBe('completed');
    expect(result.structuredContent.checks).toEqual({
      status: 'failed',
      message: `Checks: ${problem} ${warning}`,
      problems: [problem],
      warnings: [warning],
      flash: { ok: false, maxPerSecond: 5, worst: { t0: 3, t1: 4, count: 5 } },
    });
    expect(result.content[0].text.split('\n')[1]).toBe(`Checks: ${problem} ${warning}`);
  });

  it('adds warnings to a passing check that found no colour tags', async () => {
    write('a.html');
    const warning = 'The video has no color tags: players may show it washed out. Re-render with this Helios version.';
    const fake = renderRunner(finishRender, (c) => {
      c.out(JSON.stringify({
        ...CHECK_PASS,
        video: { ...CHECK_PASS.video, color: { matrix: null, primaries: null, transfer: null, range: null } },
        flash: { ok: true, maxPerSecond: 0, worst: null, red: false },
        warnings: [warning],
      }));
      c.exit(0);
    });
    await connect(fake.runner);
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(result.structuredContent.checks).toMatchObject({ status: 'passed', flash: { ok: true, worst: null } });
    expect(result.content[0].text.split('\n')[1]).toBe(`Checks: no flashing above WCAG 2.3.1. ${warning}`);
  });

  it('says in one line when the check itself fails, and keeps the render successful', async () => {
    write('a.html');
    const fake = renderRunner(finishRender, (c) => {
      c.err('Check failed: ffmpeg could not read a.mp4: moov atom not found\n');
      c.exit(1);
    });
    await connect(fake.runner);
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      status: 'completed',
      checks: {
        status: 'error',
        message: 'Checks: could not check a.mp4: ffmpeg could not read a.mp4: moov atom not found',
        problems: [],
        warnings: [],
      },
    });
    expect(result.content[0].text.split('\n')).toHaveLength(2);
    expect(result.content[0].text.split('\n')[1]).toBe('Checks: could not check a.mp4: ffmpeg could not read a.mp4: moov atom not found');
  });

  it('treats a check that prints no report as a check error', async () => {
    write('a.html');
    const fake = renderRunner(finishRender, (c) => { c.out('error: unknown command \'check\'\n'); c.exit(0); });
    await connect(fake.runner);
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    expect(result.structuredContent.checks).toMatchObject({ status: 'error', message: 'Checks: could not check a.mp4: helios check printed no report.' });
  });

  it('reports a slow check as still running, then its result on the next status call', async () => {
    write('a.html');
    const fake = renderRunner(finishRender, () => {});
    await connect(fake.runner, { checkWaitMs: 50 });
    const result = await call('render_video', { path: 'a.html', waitSeconds: 5 });
    const jobId = result.structuredContent.jobId;
    expect(result.structuredContent).toMatchObject({ status: 'completed', checks: { status: 'running' } });
    expect(result.content[0].text.split('\n')[1]).toBe(`Checks: still checking a.mp4; get_render_status with jobId "${jobId}" reports them.`);

    passCheck(fake.calls[1]);
    const later = await call('get_render_status', { jobId, waitSeconds: 0 });
    expect(later.structuredContent.checks.status).toBe('passed');
    expect(fake.calls.map((c) => c.args[0])).toEqual(['render', 'check']);
  });

  it('does not check a cancelled render', async () => {
    write('a.html');
    const fake = renderRunner();
    await connect(fake.runner);
    const started = await call('render_video', { path: 'a.html', waitSeconds: 0 });
    const cancelled = await call('cancel_render', { jobId: started.structuredContent.jobId });
    expect(cancelled.structuredContent.checks).toBeUndefined();
    fake.calls[0].exit(null, 'SIGTERM');
    await tick();
    expect(fake.calls).toHaveLength(1);
  });
});

describe('helios MCP server: new results match their output schemas', () => {
  it('analyze_audio, verify_video and render_video results pass a JSON Schema 2020-12 validator', async () => {
    write('a.html');
    write('song.mp3', 'x');
    write('words.json', '[]');
    const verifyReport = {
      ok: false,
      purity: { ok: false, samples: 6, differing: [1, { t: 2 }, 'x'], noisy: [3], message: 'Frames at 1s, 2s differ.' },
      cues: { ok: false, total: 2, shown: 1, missing: [{ text: 'hi', start: 1, end: 2, seen: 7 }], message: '1 of 2 cues.' },
      extra: { anything: true },
    };
    const fake = fakeRunner((c) => {
      if (c.args[0] === 'analyze') {
        fs.writeFileSync(c.args[c.args.indexOf('-o') + 1], JSON.stringify({ ...BEATS, sections: [{ t0: 0, t1: 1 }, { t0: 'x' }], hits: [{ t: 1 }, null] }));
        c.exit(0);
      } else if (c.args[0] === 'verify') {
        c.out(JSON.stringify(verifyReport));
        c.exit(1);
      } else if (c.args[0] === 'check') {
        c.out(JSON.stringify({ ok: true, flash: { ok: true, worst: { t0: 'x' } }, problems: [1, 'p'], warnings: null }));
        c.exit(0);
      } else {
        finishRender(c);
      }
    });
    await connect(fake.runner);
    const ajv = new Ajv2020({ strict: false });
    const { tools } = await client.listTools();
    const validate = (name: string) => ajv.compile(tools.find((t) => t.name === name)!.outputSchema!);

    for (const [name, args] of [
      ['analyze_audio', { path: 'song.mp3' }],
      ['verify_video', { path: 'a.html', cues: 'words.json' }],
      ['render_video', { path: 'a.html', waitSeconds: 5 }],
    ] as const) {
      const result = await call(name, args);
      expect(result.isError, `${name}: ${result.content?.[0]?.text}`).toBeFalsy();
      const validator = validate(name);
      expect(validator(result.structuredContent), `${name}: ${JSON.stringify(validator.errors)}`).toBe(true);
    }
  });
});
