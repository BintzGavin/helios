/**
 * A page's frame hook (window.renderAt / __render / seek) that throws or rejects must fail
 * the render with the page's own error, naming the hook and the time, instead of
 * silently producing a video with wrong frames.
 */
import { Renderer } from '../src/index';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CASES = [
  { fixture: 'seek-hook-throws.html', mode: 'canvas' as const, expect: ['window.renderAt(0.5) threw', 'boom at 0.5'] },
  { fixture: 'seek-hook-rejects.html', mode: 'dom' as const, expect: ['window.seek(0.5) threw', 'async boom at 0.5'] },
];

async function main() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-hook-errors-'));
  let failures = 0;
  try {
    for (const testCase of CASES) {
      const renderer = new Renderer({ width: 320, height: 180, fps: 10, durationInSeconds: 1, mode: testCase.mode });
      const url = pathToFileURL(path.join(__dirname, 'fixtures', testCase.fixture)).href;
      const started = Date.now();
      let message: string | null = null;
      try {
        await renderer.render(url, path.join(outDir, testCase.fixture.replace('.html', '.mp4')));
      } catch (err: any) {
        message = String(err?.message || err);
      }
      const seconds = (Date.now() - started) / 1000;
      const problems: string[] = [];
      if (message === null) problems.push('render succeeded; it should have failed');
      for (const text of testCase.expect) {
        if (message !== null && !message.includes(text)) problems.push(`error does not mention "${text}": ${message.slice(0, 300)}`);
      }
      if (seconds > 15) problems.push(`took ${seconds.toFixed(1)}s to fail`);
      console.log(`${problems.length ? '❌' : '✅'} ${testCase.fixture} [${testCase.mode}] in ${seconds.toFixed(1)}s`);
      for (const p of problems) console.log(`     ${p}`);
      failures += problems.length;
    }
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  if (failures > 0) {
    console.error(`\n❌ ${failures} hook error check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ Throwing and rejecting frame hooks fail the render with the page error.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
