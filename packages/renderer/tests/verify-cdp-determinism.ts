import { chromium, Browser, Page } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';

async function runSession(): Promise<number[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const driver = new CdpTimeDriver();

  // Basic HTML to execute JS
  await page.setContent('<html><body></body></html>');

  await driver.prepare(page);

  const timestamps: number[] = [];
  const timesToCheck = [0, 1, 2, 5]; // Seconds

  for (const t of timesToCheck) {
    await driver.setTime(page, t);
    const now = await page.evaluate(() => Date.now());
    timestamps.push(now);
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
      if (run1[i] !== run2[i]) {
        console.error(`❌ Mismatch at step ${i}: ${run1[i]} !== ${run2[i]}`);
        failures++;
      }
    }
  }

  // 2. Check anchor to epoch (Jan 1, 2024 = 1704067200000 ms)
  // Note: Before the fix, this will likely fail (it will be current date)
  // After the fix, it should be exactly 1704067200000 + offset
  const EXPECTED_EPOCH = 1704067200000;
  const tolerance = 1000; // Allow slight drift if any, but virtual time should be precise

  if (Math.abs(run1[0] - EXPECTED_EPOCH) > tolerance) {
    console.warn(`⚠️  Initial timestamp ${run1[0]} is far from target epoch ${EXPECTED_EPOCH} (Diff: ${run1[0] - EXPECTED_EPOCH}ms).`);
    console.warn(`    This is expected BEFORE the fix. After the fix, this should be close to 0.`);
    // We don't fail yet because we haven't applied the fix, but this is a good indicator.
  } else {
    console.log(`✅ Initial timestamp is correctly anchored to Jan 1, 2024.`);
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
