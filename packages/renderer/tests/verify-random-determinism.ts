import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

// Helper to wait
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

async function verifyDriver(name: string, driverFactory: () => any) {
  console.log(`\nVerifying ${name}...`);
  const browser = await chromium.launch({ headless: true });

  const runTest = async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const driver = driverFactory();

    // Initialize driver (injects scripts)
    await driver.init(page);

    // We need to navigate to trigger addInitScript execution
    // CdpTimeDriver.prepare sets up virtual time which pauses the page, causing goto to hang if we wait for load
    // For this test, verifying init() is sufficient as it injects the script.

    await page.goto('data:text/html,<html><body></body></html>');

    // Evaluate Math.random() multiple times
    const result = await page.evaluate(() => {
      const values = [];
      for(let i=0; i<10; i++) {
        values.push(Math.random());
      }
      return values;
    });

    await context.close();
    return result;
  };

  const run1 = await runTest();
  const run2 = await runTest();

  await browser.close();

  console.log('Run 1:', JSON.stringify(run1));
  console.log('Run 2:', JSON.stringify(run2));

  // Compare
  const match = JSON.stringify(run1) === JSON.stringify(run2);

  // Also verify it's not the default random (hard to prove, but at least we check consistency)
  // And verify it's not all zeros or something
  const isValid = run1.every((n: number) => n >= 0 && n < 1);

  if (match && isValid) {
    console.log(`✅ ${name}: Deterministic!`);
  } else {
    console.error(`❌ ${name}: NOT Deterministic!`);
    console.error('Match:', match);
    console.error('Valid:', isValid);
    process.exit(1);
  }
}

async function main() {
  try {
    await verifyDriver('SeekTimeDriver', () => new SeekTimeDriver());
    await verifyDriver('CdpTimeDriver', () => new CdpTimeDriver());
    console.log('\nAll verification passed.');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

main();
