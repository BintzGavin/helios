/**
 * On a machine without Playwright's browsers (a fresh install, CI, a cloud agent sandbox),
 * launching fails with "Executable doesn't exist". The renderer must install the browser
 * that its own Playwright version expects and retry once. Following Playwright's hint
 * (`npx playwright install`) fetches the latest Playwright's browser, which is the wrong
 * build for the renderer's pinned version.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchChromium, playwrightInstallCommand } from '../src/core/launchBrowser.js';

const MISSING = new Error("browserType.launch: Executable doesn't exist at /tmp/nowhere/chrome-headless-shell\nLooks like Playwright was just installed or updated.");

function fakes(failures: Error[]) {
  const calls = { launch: 0, installs: [] as string[] };
  const deps = {
    launch: async (_options: any) => {
      calls.launch++;
      const failure = failures.shift();
      if (failure) throw failure;
      return 'browser' as any;
    },
    install: (browser: string) => { calls.installs.push(browser); },
  };
  return { calls, deps };
}

const checks: Array<[string, () => Promise<void>]> = [
  ['installs the headless shell once and retries when the browser is missing', async () => {
    const { calls, deps } = fakes([MISSING]);
    assert.equal(await launchChromium({ headless: true }, deps), 'browser');
    assert.deepEqual(calls.installs, ['chromium-headless-shell']);
    assert.equal(calls.launch, 2);
  }],
  ['installs full Chromium for a headed launch', async () => {
    const { calls, deps } = fakes([MISSING]);
    await launchChromium({ headless: false }, deps);
    assert.deepEqual(calls.installs, ['chromium']);
  }],
  ['leaves a custom executablePath alone', async () => {
    const { calls, deps } = fakes([MISSING]);
    await assert.rejects(launchChromium({ headless: true, executablePath: '/opt/chrome' }, deps), /Executable doesn't exist/);
    assert.deepEqual(calls.installs, []);
  }],
  ['respects HELIOS_SKIP_BROWSER_DOWNLOAD', async () => {
    const { calls, deps } = fakes([MISSING]);
    process.env.HELIOS_SKIP_BROWSER_DOWNLOAD = '1';
    try {
      await assert.rejects(launchChromium({ headless: true }, deps), /npx playwright@\d+\.\d+\.\d+ install chromium-headless-shell/);
    } finally {
      delete process.env.HELIOS_SKIP_BROWSER_DOWNLOAD;
    }
    assert.deepEqual(calls.installs, []);
  }],
  ['rethrows other launch errors untouched', async () => {
    const { calls, deps } = fakes([new Error('Target page, context or browser has been closed')]);
    await assert.rejects(launchChromium({ headless: true }, deps), /has been closed/);
    assert.deepEqual(calls.installs, []);
  }],
  ['does not loop when the browser is still missing after installing', async () => {
    const { calls, deps } = fakes([MISSING, MISSING]);
    await assert.rejects(launchChromium({ headless: true }, deps), /Executable doesn't exist/);
    assert.equal(calls.launch, 2);
    assert.equal(calls.installs.length, 1);
  }],
  ["points at the renderer's own Playwright CLI and version", async () => {
    const { cli, version, hint } = playwrightInstallCommand('chromium-headless-shell');
    assert.ok(fs.existsSync(cli), `Playwright CLI not found at ${cli}`);
    assert.match(version, /^\d+\.\d+\.\d+/);
    assert.equal(hint, `npx playwright@${version} install chromium-headless-shell`);
  }],
];

let failures = 0;
for (const [name, check] of checks) {
  try {
    await check();
    console.log(`✅ ${name}`);
  } catch (error) {
    failures++;
    console.error(`❌ ${name}`);
    console.error(error);
  }
}
if (failures > 0) {
  console.error(`\n❌ ${failures} browser install check(s) failed.`);
  process.exit(1);
}
console.log('\n✅ A missing browser is installed once, with the matching Playwright version.');
