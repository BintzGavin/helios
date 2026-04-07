import { chromium, Browser, ConsoleMessage } from 'playwright';
import os from 'os';
import fs from 'fs';
import { RenderStrategy } from '../strategies/RenderStrategy.js';
import { CanvasStrategy } from '../strategies/CanvasStrategy.js';
import { DomStrategy } from '../strategies/DomStrategy.js';
import { TimeDriver } from '../drivers/TimeDriver.js';
import { CdpTimeDriver } from '../drivers/CdpTimeDriver.js';
import { SeekTimeDriver } from '../drivers/SeekTimeDriver.js';
import { RendererOptions, RenderJobOptions } from '../types.js';

const DEFAULT_BROWSER_ARGS = [
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-default-apps',
  '--disable-sync',
  '--no-first-run',
  '--mute-audio',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad',
  '--disable-web-security',
  '--allow-file-access-from-files',
  '--enable-begin-frame-control',
  '--run-all-compositor-stages-before-draw',
  '--process-per-tab'
];

const GPU_DISABLED_ARGS = [
  '--disable-gpu',
  '--disable-gpu-compositing',
];

export interface WorkerInfo {
  context: import('playwright').BrowserContext;
  page: import('playwright').Page;
  strategy: RenderStrategy;
  timeDriver: TimeDriver;
  activePromise: Promise<void>;
}

export class BrowserPool {
  private options: RendererOptions;
  public browser: Browser | null = null;
  public workers: WorkerInfo[] = [];
  public capturedErrors: Error[] = [];

  constructor(options: RendererOptions) {
    this.options = options;
  }

  public getLaunchOptions() {
    const config = this.options.browserConfig || {};
    const userArgs = config.args || [];
    const gpuArgs = config.gpu === false ? GPU_DISABLED_ARGS : [];

    let executablePath = config.executablePath;

    if (!executablePath) {
      // Try to find chrome-headless-shell in common Playwright installation paths dynamically
      const commonPaths = [
        process.env.PLAYWRIGHT_BROWSERS_PATH,
        `${os.homedir()}/.cache/ms-playwright`,
        '/opt/jules/pipx/venvs/playwright/lib/python3.12/site-packages/playwright/driver/package/.local-browsers',
        '/usr/local/lib/node_modules/playwright/node_modules/playwright-core/.local-browsers',
        '/usr/lib/node_modules/playwright/node_modules/playwright-core/.local-browsers'
      ].filter(Boolean) as string[];

      for (const basePath of commonPaths) {
        if (!fs.existsSync(basePath)) continue;

        try {
          const dirs = fs.readdirSync(basePath);
          const shellDir = dirs.find(dir => dir.startsWith('chromium_headless_shell-'));

          if (shellDir) {
            const binaryPath = `${basePath}/${shellDir}/chrome-headless-shell-linux64/chrome-headless-shell`;
            if (fs.existsSync(binaryPath)) {
              executablePath = binaryPath;
              break;
            }
          }
        } catch (err) {
        }
      }
    }

    return {
      headless: config.headless ?? true,
      executablePath: executablePath,
      args: [...DEFAULT_BROWSER_ARGS, ...gpuArgs, ...userArgs],
      pipe: true,
    };
  }

  public async init(compositionUrl: string, jobOptions?: RenderJobOptions): Promise<void> {
    this.browser = await chromium.launch(this.getLaunchOptions());
    this.capturedErrors = [];

    const concurrency = Math.min(os.cpus().length || 4, 8);
    console.log(`Initializing pool of ${concurrency} pages...`);

    const createPage = async (index: number): Promise<WorkerInfo> => {
      const pageContext = await this.browser!.newContext({
        viewport: {
          width: this.options.width,
          height: this.options.height,
        },
      });

      if (jobOptions?.tracePath) {
        console.log(`Enabling Playwright tracing for worker ${index}...`);
        await pageContext.tracing.start({ screenshots: true, snapshots: true });
      }

      const page = await pageContext.newPage();
      const strategy = this.options.mode === 'dom' ? new DomStrategy(this.options) : new CanvasStrategy(this.options);
      const timeDriver = this.options.mode === 'dom' ? new SeekTimeDriver(this.options.stabilityTimeout) : new CdpTimeDriver(this.options.stabilityTimeout);

      page.on('console', (msg: ConsoleMessage) => console.log(`PAGE LOG [${index}]: ${msg.text()}`));
      page.on('pageerror', (err: Error) => {
        console.error(`PAGE ERROR [${index}]: ${err.message}`);
        this.capturedErrors.push(err);
      });
      page.on('crash', () => {
        const err = new Error(`Page ${index} crashed!`);
        console.error(err.message);
        this.capturedErrors.push(err);
      });

      if (this.options.inputProps) {
        const serializedProps = JSON.stringify(this.options.inputProps);
        await page.addInitScript(`window.__HELIOS_PROPS__ = ${serializedProps};`);
      }

      await timeDriver.init(page, this.options.randomSeed);
      await page.goto(compositionUrl, { waitUntil: 'networkidle' });

      await strategy.prepare(page);
      await timeDriver.prepare(page);

      return { context: pageContext, page, strategy, timeDriver, activePromise: Promise.resolve() };
    };

    const poolPromises = [];
    for (let i = 0; i < concurrency; i++) {
      poolPromises.push(createPage(i));
    }
    this.workers = await Promise.all(poolPromises);

    console.log('All pages loaded and prepared.');
  }

  public async close(jobOptions?: RenderJobOptions): Promise<void> {
    if (jobOptions?.tracePath && this.workers.length > 0) {
      console.log('Stopping tracing...');
      await this.workers[0].context.tracing.stop({ path: jobOptions.tracePath });
    }
    for (const worker of this.workers) {
      await worker.context.close();
    }
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed.');
    }
  }

  public async cleanupStrategies(): Promise<void> {
    console.log('Cleaning up strategy resources...');
    for (const worker of this.workers) {
      if (worker.strategy.cleanup) {
        await worker.strategy.cleanup();
      }
    }
  }
}
