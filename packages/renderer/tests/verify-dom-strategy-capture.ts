import { chromium } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy.js';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-begin-frame-control', '--run-all-compositor-stages-before-draw'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const driver = new CdpTimeDriver();
  await driver.prepare(page);

  const strategy = new DomStrategy({
    fps: 30,
    videoCodec: 'libx264',
    mode: 'dom',
    width: 1920,
    height: 1080,
    durationInSeconds: 1,
    intermediateImageFormat: 'png'
  });
  await strategy.prepare(page);

  driver.setTime(page, 0.5);
  // Wait for setTime async execution to complete
  await new Promise(r => setTimeout(r, 100));

  const result = await strategy.capture(page, 0.5);

  console.log(`Buffer returned: ${Buffer.isBuffer(result) || typeof result === 'string'}`);

  await browser.close();
}
test().catch(err => {
  console.error(err);
  process.exit(1);
});
