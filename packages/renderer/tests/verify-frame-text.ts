/**
 * readFrameText() reports the text on screen at each time, for checking that lyrics and
 * captions show when they should: visible DOM and SVG text (not hidden by display,
 * visibility, opacity, transparent ink, clipping or the viewport edge), and what a canvas page
 * declared with window.heliosDrawnText.add() for that frame only.
 */
import { readFrameText } from '../src/index';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => pathToFileURL(path.join(__dirname, 'fixtures', name)).href;

async function main() {
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    console.log(`${ok ? '✅' : '❌'} ${message}`);
    if (!ok) failures.push(message);
  };

  // DOM and SVG text: what counts as visible.
  const [atZero, atOne] = await readFrameText(fixture('frame-text-visibility.html'), [0, 1], { width: 1920, height: 1080 });
  const visible = [
    'LADIES', 'halfword', 'gradientword', 'FLEX', 'ABS', 'TRACK', 'two', 'words', 'gap', 'separated',
    'partly', 'shadowword', 'contentsword', 'fixedescapes', 'svgword', 'svgjoined',
  ];
  const hidden = [
    'faintword', 'zeroopacity', 'offscreen', 'displaynone', 'visibilityhidden', 'transparentword',
    'scaledzero', 'maskedword', 'clippedbyparent', 'beyondtheedge', 'svghidden', 'later',
  ];
  console.log(`Runs on screen at t=0: ${JSON.stringify(atZero.text)}`);
  for (const word of visible) check(atZero.text.includes(word), `"${word}" is on screen`);
  for (const word of hidden) check(!atZero.text.some((run) => run.includes(word)), `"${word}" is not on screen`);
  check(atOne.text.includes('later'), `"later" is on screen once renderAt(1) shows it`);
  check(atZero.drawn.length === 0, 'a page that marks nothing has no drawn text');

  // A canvas drawn from a rAF loop marks one word per second: each frame holds exactly the
  // word for its own time, never the previous frame's.
  const times = [0.5, 1.5, 2.5, 0.2, 3.1];
  const raf = await readFrameText(fixture('frame-text-canvas-raf.html'), times, { width: 320, height: 180 });
  const expected = ['zero', 'one', 'two', 'zero', 'three'];
  raf.forEach((frame, i) => {
    check(JSON.stringify(frame.drawn) === JSON.stringify([expected[i]]),
      `rAF canvas at t=${times[i]}s marked ${JSON.stringify(frame.drawn)} (expected ["${expected[i]}"])`);
  });

  // A Helios composition: DOM text and marked canvas text from subscribe.
  const helios = await readFrameText(fixture('frame-text-helios.html'), [0.5, 1.5, 0.2], { width: 320, height: 400 });
  const heliosExpected = [['first caption', 'alpha'], ['second caption', 'beta'], ['first caption', 'alpha']];
  helios.forEach((frame, i) => {
    const [caption, word] = heliosExpected[i];
    check(frame.text.includes(caption) && JSON.stringify(frame.drawn) === JSON.stringify([word]),
      `Helios page frame ${i}: text ${JSON.stringify(frame.text)}, drawn ${JSON.stringify(frame.drawn)} (expected "${caption}", ["${word}"])`);
  });

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} frame text check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✅ readFrameText reports visible and drawn text per frame.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
