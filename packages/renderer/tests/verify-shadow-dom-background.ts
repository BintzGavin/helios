import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

async function verify() {
  console.log('Verifying Shadow DOM Background Image Discovery...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let requestMade = false;
  const targetUrl = 'https://example.com/shadow-bg.png';

  // Intercept requests
  await page.route(targetUrl, (route: Route) => {
    console.log('✅ Intercepted request for:', targetUrl);
    requestMade = true;
    route.fulfill({ status: 200, body: 'dummy image data', contentType: 'image/png' });
  });

  // Create a page with a Custom Element containing a Shadow Root with a div having background-image
  await page.setContent(`
    <html>
      <head>
        <style>
          body { margin: 0; }
        </style>
      </head>
      <body>
        <script>
          class BgComponent extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
              this.shadowRoot.innerHTML = \`
                <div style="
                  width: 100px;
                  height: 100px;
                  background-image: url('${targetUrl}');
                "></div>
              \`;
            }
          }
          customElements.define('bg-component', BgComponent);
        </script>
        <bg-component></bg-component>
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
      const match = text.match(/Preloading (\d+) background images/);
      if (match) {
        preloadCount = parseInt(match[1], 10);
        console.log(`[Page Console] ${text}`);
      }
    }
  });

  // prepare() should trigger the preloading logic which makes a request to the background image
  await strategy.prepare(page);

  await browser.close();

  if (preloadCount === 1) {
    console.log('✅ DomStrategy found the shadow DOM background image.');
    console.log('✅ Verification Passed');
    process.exit(0);
  } else {
    console.error(`❌ Failed: Expected DomStrategy to find 1 background image, but found ${preloadCount}.`);
    console.error('❌ Verification Failed');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
