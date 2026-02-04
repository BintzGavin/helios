import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verify() {
  console.log('Starting Virtual Time Binding Verification...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const driver = new SeekTimeDriver();

  await driver.init(page);
  await driver.prepare(page);

  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  // -------------------------------------------------------------------------
  // Scenario 1: Mock Helios with isVirtualTimeBound = false
  // -------------------------------------------------------------------------
  console.log('\nTesting Scenario 1: isVirtualTimeBound = false');
  await page.evaluate(`
    window.helios = {
      isVirtualTimeBound: false,
      seek: () => {},
      waitUntilStable: async () => {}
    };
  `);

  await driver.setTime(page, 1.0);

  const warningMsg = '[SeekTimeDriver] Warning: Helios is not reactively bound to virtual time. Fallback polling usage detected.';
  const hasWarning = logs.some(msg => msg.includes(warningMsg));

  if (!hasWarning) {
     console.error('❌ Scenario 1 Failed: Expected warning was NOT logged.');
     // We exit here because this is the primary functionality we are adding
     await browser.close();
     process.exit(1);
  } else {
     console.log('✅ Scenario 1 Passed: Warning found.');
  }

  // -------------------------------------------------------------------------
  // Scenario 2: Mock Helios with isVirtualTimeBound = true
  // -------------------------------------------------------------------------
  console.log('\nTesting Scenario 2: isVirtualTimeBound = true');
  logs.length = 0; // Clear logs
  await page.evaluate(`
    window.helios.isVirtualTimeBound = true;
  `);

  await driver.setTime(page, 2.0);

  const hasWarning2 = logs.some(msg => msg.includes(warningMsg));
  if (hasWarning2) {
     console.error('❌ Scenario 2 Failed: Warning was logged unexpectedly.');
     await browser.close();
     process.exit(1);
  } else {
     console.log('✅ Scenario 2 Passed: No warning.');
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Verify __HELIOS_VIRTUAL_TIME__ is set
  // -------------------------------------------------------------------------
  console.log('\nTesting Scenario 3: Check __HELIOS_VIRTUAL_TIME__');
  const virtualTime = await page.evaluate(() => (window as any).__HELIOS_VIRTUAL_TIME__);
  if (virtualTime !== 2000) { // 2.0s * 1000
      console.error(`❌ Scenario 3 Failed: __HELIOS_VIRTUAL_TIME__ is ${virtualTime}, expected 2000`);
      await browser.close();
      process.exit(1);
  } else {
      console.log('✅ Scenario 3 Passed: __HELIOS_VIRTUAL_TIME__ is correct.');
  }

  await browser.close();
  console.log('\n✅ SUCCESS: All scenarios passed.');
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
