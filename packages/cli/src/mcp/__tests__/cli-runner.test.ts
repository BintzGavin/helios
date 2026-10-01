import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createCliRunner, defaultCliBin, errorFromStderr, runCli } from '../cli-runner.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'helios-runner-')));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function bin(source: string): string {
  const file = path.join(tmp, 'fake-helios.mjs');
  fs.writeFileSync(file, source);
  return file;
}

describe('createCliRunner', () => {
  it('points at the package bin', () => {
    expect(defaultCliBin()).toBe(path.resolve(__dirname, '../../../bin/helios.js'));
    expect(fs.existsSync(defaultCliBin())).toBe(true);
  });

  it('runs node <bin> <args> in the given folder without a shell and captures both streams', async () => {
    const runner = createCliRunner(bin(
      'console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));\n' +
      'console.error("to stderr");\nprocess.exit(3);\n',
    ));
    const result = await runCli(runner, ['render', 'a b.html', '$(touch pwned)', '--fps', '30'], tmp);
    expect(result.code).toBe(3);
    expect(JSON.parse(result.stdout)).toEqual({ args: ['render', 'a b.html', '$(touch pwned)', '--fps', '30'], cwd: tmp });
    expect(result.stderr).toBe('to stderr\n');
    expect(fs.existsSync(path.join(tmp, 'pwned'))).toBe(false);
  });

  it('kills the process when the signal aborts', async () => {
    const runner = createCliRunner(bin('setInterval(() => {}, 1000);\n'));
    const controller = new AbortController();
    const pending = runCli(runner, [], tmp, controller.signal);
    setTimeout(() => controller.abort(), 50);
    const result = await pending;
    expect(result.signal).toBe('SIGTERM');
  });
});

describe('errorFromStderr', () => {
  it('keeps everything after the last "<Command> failed:" prefix', () => {
    expect(errorFromStderr('noise\nRender failed: first line\n  at detail\n', 'Render failed:')).toBe('first line\n  at detail');
  });

  it('falls back to the last lines', () => {
    expect(errorFromStderr('a\nb\n\nc\nd\ne\nf\n')).toBe('b\nc\nd\ne\nf');
    expect(errorFromStderr('\x1b[31mred\x1b[0m')).toBe('red');
  });
});
