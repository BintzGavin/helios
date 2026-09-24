import { chromium, Browser, LaunchOptions } from 'playwright';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const MISSING_EXECUTABLE = /Executable doesn't exist/;

interface LaunchDeps {
  launch: (options: LaunchOptions) => Promise<Browser>;
  install: (browser: string) => void;
}

const defaultDeps: LaunchDeps = {
  launch: (options) => chromium.launch(options),
  install: installPlaywrightBrowser,
};

/**
 * Launches Chromium, installing it first when Playwright has none. A fresh install, a CI
 * runner or a cloud agent sandbox has no browsers, and Playwright's own hint
 * (`npx playwright install`) fetches the latest Playwright's browser build rather than the
 * one this renderer's pinned Playwright expects. So install the matching build, once, and
 * retry. Set HELIOS_SKIP_BROWSER_DOWNLOAD=1 to fail instead.
 */
export async function launchChromium(options: LaunchOptions, deps: LaunchDeps = defaultDeps): Promise<Browser> {
  try {
    return await deps.launch(options);
  } catch (err: any) {
    const message = String(err?.message ?? err);
    if (options.executablePath || !MISSING_EXECUTABLE.test(message)) throw err;

    const browser = options.headless === false ? 'chromium' : 'chromium-headless-shell';
    const { hint } = playwrightInstallCommand(browser);
    if (process.env.HELIOS_SKIP_BROWSER_DOWNLOAD) {
      throw new Error(`Helios needs ${browser}, which isn't installed. Install it with: ${hint}\n\n${message}`);
    }
    console.log(`Helios needs ${browser} and none is installed; downloading it once (${hint})...`);
    deps.install(browser);
    return await deps.launch(options);
  }
}

/** The CLI of the Playwright version this renderer runs on, and the matching install command. */
export function playwrightInstallCommand(browser: string): { cli: string; version: string; hint: string } {
  const require = createRequire(import.meta.url);
  const manifest = require.resolve('playwright-core/package.json');
  const version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version as string;
  return {
    cli: path.join(path.dirname(manifest), 'cli.js'),
    version,
    hint: `npx playwright@${version} install ${browser}`,
  };
}

function installPlaywrightBrowser(browser: string): void {
  const { cli, hint } = playwrightInstallCommand(browser);
  const result = spawnSync(process.execPath, [cli, 'install', browser], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Could not install ${browser}. Install it yourself with: ${hint}`);
  }
}
