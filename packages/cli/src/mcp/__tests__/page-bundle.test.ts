import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';
import { bundlePage } from '../page-bundle.js';

let tmp: string;
let root: string;

function write(rel: string, content: string | Buffer, base = root) {
  const file = path.join(base, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'helios-bundle-')));
  root = path.join(tmp, 'project');
  fs.mkdirSync(root);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('bundlePage', () => {
  it('inlines images, media, scripts and stylesheets next to the page', async () => {
    write('video/logo.png', PNG);
    write('video/sound.mp3', 'ID3');
    write('video/app.js', 'window.answer = 42;');
    write('video/mod.js', 'export const x = 1;');
    write('video/style.css', 'body { color: red; }');
    const page = write('video/index.html', `<!doctype html><html><head>
<link rel="stylesheet" href="style.css" media="screen">
<link rel="icon" href="logo.png">
</head><body>
<img alt="logo" src="./logo.png" />
<audio src='sound.mp3'></audio>
<script src="app.js"></script>
<script type="module" src="mod.js?v=2"></script>
</body></html>`);

    const bundle = await bundlePage(page, root);

    expect(bundle.html).toContain(`<img alt="logo" src="data:image/png;base64,${PNG.toString('base64')}" />`);
    expect(bundle.html).toContain(`<audio src="data:audio/mpeg;base64,${Buffer.from('ID3').toString('base64')}">`);
    expect(bundle.html).toContain('<script>window.answer = 42;</script>');
    expect(bundle.html).toContain('<script type="module">export const x = 1;</script>');
    expect(bundle.html).toContain('<style media="screen">body { color: red; }</style>');
    // Only stylesheets are inlined among <link>s.
    expect(bundle.html).toContain('<link rel="icon" href="logo.png">');
    expect(bundle.inlined.sort()).toEqual(['video/app.js', 'video/logo.png', 'video/mod.js', 'video/sound.mp3', 'video/style.css']);
    expect(bundle.skipped).toEqual([]);
  });

  it('serves quoted file paths in scripts to fetch() through an injected shim', async () => {
    write('data/points.json', '{"a":1}');
    const page = write('index.html', `<html><head><title>t</title></head><body><script>
fetch('data/points.json').then((r) => r.json());
const other = "./data/points.json";
const remote = 'https://example.com/x.json';
const missing = 'nope.csv';
</script></body></html>`);

    const bundle = await bundlePage(page, root);

    expect(bundle.html.indexOf('window.__HELIOS_FILES__')).toBeGreaterThan(bundle.html.indexOf('<head>'));
    expect(bundle.html.indexOf('window.__HELIOS_FILES__')).toBeLessThan(bundle.html.indexOf('<title>'));
    expect(bundle.inlined).toEqual(['data/points.json']);
    expect(bundle.skipped).toEqual(['nope.csv (not found)']);

    // Run the shim against a fake fetch and check what it serves.
    const shim = /<script>(\(function\(\)\{[\s\S]*?)<\/script>/.exec(bundle.html)![1];
    const realCalls: unknown[] = [];
    const sandbox: any = {
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
      Response: class {
        constructor(public body: Uint8Array, public init: any) {}
      },
      Uint8Array,
      Promise,
    };
    sandbox.window = sandbox;
    sandbox.fetch = (...args: unknown[]) => { realCalls.push(args[0]); return Promise.resolve('real'); };
    vm.runInNewContext(shim, sandbox);

    expect(Object.keys(sandbox.__HELIOS_FILES__).sort()).toEqual(['./data/points.json', 'data/points.json']);
    for (const url of ['data/points.json', './data/points.json', 'data/points.json?x=1', 'https://view.example/a/data/points.json']) {
      const res = await sandbox.fetch(url);
      expect(Buffer.from(res.body).toString()).toBe('{"a":1}');
      expect(res.init.headers['Content-Type']).toBe('application/json');
    }
    expect(await sandbox.fetch('other.json')).toBe('real');
    expect(realCalls).toEqual(['other.json']);
  });

  it('skips remote URLs, absolute paths and files outside the root', async () => {
    write('secret.png', PNG, tmp);
    write('inside.png', PNG);
    fs.symlinkSync(path.join(tmp, 'secret.png'), path.join(root, 'link.png'));
    const page = write('index.html', `<head></head>
<img src="../secret.png"><img src="link.png"><img src="/abs.png">
<script src="https://cdn.example.com/lib.js"></script>
<img src="//cdn.example.com/x.png"><img src="data:image/png;base64,AAAA"><img src="inside.png">
<script>const s = '../secret.png';</script>`);

    const bundle = await bundlePage(page, root);

    expect(bundle.inlined).toEqual(['inside.png']);
    expect(bundle.skipped).toEqual([
      '../secret.png (outside the project root)',
      'link.png (outside the project root)',
      '/abs.png (absolute path; use a path relative to the page)',
      'https://cdn.example.com/lib.js (remote URL; it loads from the network only if the host allows its origin)',
      '//cdn.example.com/x.png (remote URL; it loads from the network only if the host allows its origin)',
    ]);
    expect(bundle.html).toContain('<img src="../secret.png">');
    expect(bundle.html).toContain('<script src="https://cdn.example.com/lib.js"></script>');
    expect(bundle.html).toContain('<img src="data:image/png;base64,AAAA">');
    expect(bundle.html).not.toContain('__HELIOS_FILES__');
  });

  it('stops inlining at the size cap', async () => {
    write('a.png', Buffer.alloc(600));
    write('b.png', Buffer.alloc(600));
    write('c.png', Buffer.alloc(300));
    const page = write('index.html', '<img src="a.png"><img src="b.png"><img src="c.png"><img src="a.png">');

    const bundle = await bundlePage(page, root, { maxBytes: 1000 });

    expect(bundle.inlined).toEqual(['a.png', 'c.png']);
    expect(bundle.skipped).toEqual(['b.png (over the 1000 B inline limit)']);
    expect(bundle.html).toContain('<img src="b.png">');
    expect(bundle.html.match(/data:image\/png/g)).toHaveLength(3);
  });

  it('escapes </script> and </style> inside inlined text', async () => {
    write('app.js', 'const tag = "</script><b>"; const t2 = "</SCRIPT>";');
    write('s.css', '.a::after { content: "</style>"; }');
    const page = write('index.html', '<head><link href="s.css" rel="stylesheet"></head><script src="app.js"></script>');

    const bundle = await bundlePage(page, root);

    expect(bundle.html).toContain('<script>const tag = "<\\/script><b>"; const t2 = "<\\/SCRIPT>";</script>');
    expect(bundle.html).toContain('<style>.a::after { content: "<\\/style>"; }</style>');
    // Exactly one closing tag each: the ones the bundler wrote.
    expect(bundle.html.match(/<\/script/gi)).toHaveLength(1);
    expect(bundle.html.match(/<\/style/gi)).toHaveLength(1);
  });

  it('escapes "<" in the injected file table so file contents cannot close the script', async () => {
    write('evil.txt', '</script><script>alert(1)</script>');
    const page = write('index.html', '<head></head><script>fetch("evil.txt")</script>');

    const bundle = await bundlePage(page, root);
    const shim = /<head>(<script>[\s\S]*?<\/script>)/.exec(bundle.html)![1];
    expect(shim.match(/<\/script/gi)).toHaveLength(1);
    expect(bundle.inlined).toEqual(['evil.txt']);
  });

  it('leaves markup in comments and inline script strings alone', async () => {
    write('a.png', PNG);
    const page = write('index.html', '<!-- <img src="a.png"> --><script>const html = \'<img src="x.gif">\';</script>');

    const bundle = await bundlePage(page, root);

    expect(bundle.html).toContain('<!-- <img src="a.png"> -->');
    expect(bundle.html).toContain('const html = \'<img src="x.gif">\';');
    expect(bundle.inlined).toEqual([]);
    expect(bundle.skipped).toEqual(['x.gif (not found)']);
  });
});
