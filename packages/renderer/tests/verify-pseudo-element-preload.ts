import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

async function verify() {
  console.log('Verifying Pseudo-Element Background Image Preloading...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const beforeUrl = 'https://example.com/before-bg.png';
  const afterUrl = 'https://example.com/after-bg.png';
  const maskUrl = 'https://example.com/mask-bg.png';

  const requestedUrls = new Set<string>();

  // Intercept requests
  await page.route('**/*.png', (route: Route) => {
    const url = route.request().url();
    // console.log('✅ Intercepted request for:', url);
    requestedUrls.add(url);
    route.fulfill({ status: 200, body: 'dummy image data', contentType: 'image/png' });
  });

  // Create a page with pseudo-elements using background images and masks
  await page.setContent(`
    <html>
      <head>
        <style>
          .with-before::before {
            content: '';
            display: block;
            width: 100px;
            height: 100px;
            background-image: url('${beforeUrl}');
          }
          .with-after::after {
            content: '';
            display: block;
            width: 100px;
            height: 100px;
            background-image: url('${afterUrl}');
          }
          .with-mask::before {
            content: '';
            display: block;
            width: 100px;
            height: 100px;
            -webkit-mask-image: url('${maskUrl}');
            mask-image: url('${maskUrl}');
            background-color: red;
          }
        </style>
      </head>
      <body>
        <div class="with-before"></div>
        <div class="with-after"></div>
        <div class="with-mask"></div>
      </body>
    </html>
  `);

  const options: RendererOptions = {
    width: 1280,
    height: 720,
    fps: 30,
    durationInSeconds: 5,
    mode: 'dom'
  };

  const strategy = new DomStrategy(options);

  console.log('Running strategy.prepare()...');

  let preloadCount = 0;
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DomStrategy] Preloading')) {
       console.log(`[Page Console] ${text}`);
       const match = text.match(/Preloading (\d+) background images/);
       if (match) {
         preloadCount = parseInt(match[1], 10);
       }
    }
  });

  // prepare() should trigger the preloading logic
  await strategy.prepare(page);

  await browser.close();

  // We expect 3 images to be detected by DomStrategy
  // Note: Set uniqueness might make it 3.
  if (preloadCount === 3) {
    console.log('✅ DomStrategy correctly identified and preloaded 3 pseudo-element images.');
    console.log('✅ Verification Passed');
    process.exit(0);
  } else {
    console.error(`❌ Failed: Expected DomStrategy to find 3 background images, but found ${preloadCount}.`);
    console.error('❌ Verification Failed');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
