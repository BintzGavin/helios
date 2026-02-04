import { chromium, Browser, Page } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function runSession(): Promise<{now: number, perf: number}[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const driver = new CdpTimeDriver();

  // Basic HTML to execute JS
  await page.setContent('<html><body></body></html>');

  await driver.prepare(page);

  const timestamps: {now: number, perf: number}[] = [];
  const timesToCheck = [0, 1, 2, 5]; // Seconds

  for (const t of timesToCheck) {
    await driver.setTime(page, t);
    const now = await page.evaluate(() => Date.now());
    const perf = await page.evaluate(() => performance.now());
    timestamps.push({ now, perf });
  }

  await browser.close();
  return timestamps;
}

async function verify() {
  console.log('Starting CdpTimeDriver determinism verification...');

  // Run 1
  console.log('Running Session 1...');
  const run1 = await runSession();
  console.log('Session 1 Timestamps:', run1);

  // Run 2
  console.log('Running Session 2...');
  const run2 = await runSession();
  console.log('Session 2 Timestamps:', run2);

  let failures = 0;

  // 1. Check consistency between runs
  if (run1.length !== run2.length) {
    console.error(`❌ Length mismatch: Run1=${run1.length}, Run2=${run2.length}`);
    failures++;
  } else {
    for (let i = 0; i < run1.length; i++) {
      // Check Date.now()
      if (run1[i].now !== run2[i].now) {
        console.error(`❌ Date.now() mismatch at step ${i}: ${run1[i].now} !== ${run2[i].now}`);
        failures++;
      }
      // Check performance.now()
      // Allow extremely small epsilon for floating point, but essentially it should be exact
      if (Math.abs(run1[i].perf - run2[i].perf) > 0.001) {
         console.error(`❌ performance.now() mismatch at step ${i}: ${run1[i].perf} !== ${run2[i].perf}`);
         failures++;
      }
    }
  }

  // 2. Check anchor to epoch (Jan 1, 2024 = 1704067200000 ms)
  const EXPECTED_EPOCH = 1704067200000;
  const tolerance = 1000;

  if (Math.abs(run1[0].now - EXPECTED_EPOCH) > tolerance) {
    console.error(`❌ Initial timestamp ${run1[0].now} is far from target epoch ${EXPECTED_EPOCH}.`);
    failures++;
  } else {
    console.log(`✅ Date.now() is correctly anchored to Jan 1, 2024.`);
  }

  // 3. Check performance.now() anchor (Should be ~0 at start)
  // We expect it to be 0 because we subtracted the epoch.
  if (Math.abs(run1[0].perf) > 100) {
    console.error(`❌ Initial performance.now() ${run1[0].perf} is far from 0.`);
    failures++;
  } else {
    console.log(`✅ performance.now() is correctly anchored to 0.`);
  }

  if (failures > 0) {
    console.error(`❌ Verification failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: Runs are consistent.`);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
