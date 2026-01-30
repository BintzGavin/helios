import { chromium } from 'playwright';
import { SeekTimeDriver } from '../src/drivers/SeekTimeDriver.js';

async function verifyShadowDomAnimations() {
  console.log('Starting Shadow DOM Animation Sync verification...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .box {
          width: 100px;
          height: 100px;
          background: red;
          animation: rotate 10s linear infinite;
        }
      </style>
    </head>
    <body>
      <script>
        class AnimComponent extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' });
          }
          connectedCallback() {
            const style = document.createElement('style');
            style.textContent = \`
              @keyframes slide {
                from { transform: translateX(0px); }
                to { transform: translateX(100px); }
              }
              .box {
                width: 100px;
                height: 100px;
                background: blue;
                animation: slide 10s linear infinite;
              }
            \`;
            const box = document.createElement('div');
            box.className = 'box';
            box.id = 'shadow-box';

            this.shadowRoot.appendChild(style);
            this.shadowRoot.appendChild(box);
          }
        }
        customElements.define('anim-component', AnimComponent);
      </script>

      <div class="box" id="regular-box"></div>
      <anim-component id="comp"></anim-component>
    </body>
    </html>
  `;
  await page.goto(`data:text/html,${encodeURIComponent(htmlContent)}`);

  const driver = new SeekTimeDriver();
  await driver.init(page);
  await driver.prepare(page);

  const seekTime = 5.0;
  console.log(`Setting time to ${seekTime}s...`);

  await driver.setTime(page, seekTime);

  // Verification logic
  const result = await page.evaluate(`
    (() => {
        const regularBox = document.getElementById('regular-box');
        const comp = document.getElementById('comp');
        const shadowBox = comp && comp.shadowRoot ? comp.shadowRoot.getElementById('shadow-box') : null;

        const getTransform = (el) => el ? window.getComputedStyle(el).transform : 'null';

        return {
          regularTransform: getTransform(regularBox),
          shadowTransform: getTransform(shadowBox)
        };
    })()
  `);

  console.log(`Result at ${seekTime}s:`, result);

  // Verification helpers
  const isRotated180 = (matrix: string) => {
    // matrix(a, b, c, d, tx, ty)
    // -1, 0, 0, -1, 0, 0
    if (!matrix || matrix === 'none' || matrix === 'null') return false;
    const match = matrix.match(/matrix\(([^)]+)\)/);
    if (!match) return false;
    const parts = match[1].split(',').map(parseFloat);
    // tolerance
    return Math.abs(parts[0] + 1) < 0.05 && Math.abs(parts[3] + 1) < 0.05;
  };

  const isTranslated50 = (matrix: string) => {
    // 1, 0, 0, 1, 50, 0
    if (!matrix || matrix === 'none' || matrix === 'null') return false;
    const match = matrix.match(/matrix\(([^)]+)\)/);
    if (!match) return false;
    const parts = match[1].split(',').map(parseFloat);
    return Math.abs(parts[4] - 50) < 1; // 1px tolerance
  };

  const regularOk = isRotated180(result.regularTransform as string);
  const shadowOk = isTranslated50(result.shadowTransform as string);

  await browser.close();

  if (!regularOk) {
     console.error(`❌ FAILURE: Regular animation not synced. Got ${result.regularTransform}`);
  } else {
     console.log(`✅ SUCCESS: Regular animation synced.`);
  }

  if (shadowOk) {
    console.log(`✅ SUCCESS: Shadow DOM animation synced.`);
  } else {
    console.error(`❌ FAILURE: Shadow DOM animation NOT synced. Got ${result.shadowTransform}`);
  }

  if (!regularOk || !shadowOk) {
      process.exit(1);
  } else {
      process.exit(0);
  }
}

verifyShadowDomAnimations().catch(err => {
  console.error(err);
  process.exit(1);
});
