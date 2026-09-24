/**
 * probeComposition() reports what drives a page and, for Helios compositions, the
 * duration, fps and size the page declares, so callers (the CLI) need not guess.
 */
import { probeComposition } from '../src/index';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => pathToFileURL(path.join(__dirname, 'fixtures', name)).href;

const CASES = [
  {
    fixture: 'frame-exact-helios-canvas.html',
    expect: { driver: 'helios', durationInSeconds: 2, fps: 10, width: 320, height: 180 },
  },
  { fixture: 'frame-exact-render-at.html', expect: { driver: 'hook', hook: 'renderAt' } },
  { fixture: 'frame-exact-seek-dom.html', expect: { driver: 'hook', hook: 'seek' } },
  { fixture: 'frame-exact-raf-canvas.html', expect: { driver: 'none' } },
];

async function main() {
  let failures = 0;
  for (const testCase of CASES) {
    const started = Date.now();
    const info: any = await probeComposition(fixture(testCase.fixture));
    const seconds = (Date.now() - started) / 1000;
    const wrong = Object.entries(testCase.expect).filter(([key, value]) => info[key] !== value);
    if (testCase.expect.driver !== 'helios' && info.durationInSeconds !== undefined) {
      wrong.push(['durationInSeconds', undefined]);
    }
    if (seconds > 10) wrong.push(['seconds', `<= 10 (took ${seconds.toFixed(1)})`]);
    console.log(`${wrong.length ? '❌' : '✅'} ${testCase.fixture}: ${JSON.stringify(info)} in ${seconds.toFixed(1)}s`);
    for (const [key, value] of wrong) console.log(`     expected ${key} = ${JSON.stringify(value)}`);
    failures += wrong.length;
  }
  if (failures > 0) {
    console.error(`\n❌ ${failures} probe check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ probeComposition reports page drivers and Helios metadata.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
