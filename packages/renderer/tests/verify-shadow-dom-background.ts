import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

async function verify() {
  console.log('Verifying Shadow DOM Background Image Discovery (Nested)...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let requestMade = false;
  const targetUrl = 'https://example.com/shadow-bg.png';
  const nestedTargetUrl = 'https://example.com/nested-shadow-bg.png';

  // Intercept requests
  await page.route('**/*.png', (route: Route) => {
    const url = route.request().url();
    console.log('✅ Intercepted request for:', url);
    route.fulfill({ status: 200, body: 'dummy image data', contentType: 'image/png' });
  });

  // Create a page with Nested Shadow DOMs
  await page.setContent(`
    <html>
      <head>
        <style>
          body { margin: 0; }
        </style>
      </head>
      <body>
        <script>
          // Level 2: Child Component (Has the image)
          class ChildComponent extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
              this.shadowRoot.innerHTML = \`
                <div style="
                  width: 50px;
                  height: 50px;
                  background-image: url('${nestedTargetUrl}');
                "></div>
              \`;
            }
          }
          customElements.define('child-component', ChildComponent);

          // Level 1: Parent Component (Contains Child)
          class ParentComponent extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
              this.shadowRoot.innerHTML = \`
                <div style="padding: 10px; border: 1px solid red;">
                  <child-component></child-component>
                </div>
              \`;
            }
          }
          customElements.define('parent-component', ParentComponent);
        </script>

        <!-- Use Parent Component -->
        <parent-component></parent-component>
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

  // prepare() should trigger the preloading logic
  await strategy.prepare(page);

  await browser.close();

  // We expect 1 image to be found (the nested one)
  if (preloadCount === 1) {
    console.log('✅ DomStrategy found the nested shadow DOM background image.');
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
