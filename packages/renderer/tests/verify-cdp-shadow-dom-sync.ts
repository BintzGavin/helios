import { chromium } from 'playwright';
import { CdpTimeDriver } from '../src/drivers/CdpTimeDriver.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Small valid mp4 data uri
  const videoSrc = "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAACQG1kYXQAAAAYZ2ItYwAAAAAAAAAAAB4AAAABMITAAAAbdWR0YQAAAA1tZXRhAAAAAAAAACFocGRsAAAAH21kbXIAZmxhc2gAABnZmxhc2hwbGF5ZXIgMTAuMi4wAAAAXW1vb3YAAABsbXZoZAAAAABZJ1fXWSdX1wAA+gAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABwdHJhawAAAFx0a2hkAAAAAdknV9fZJ1fXAAAAAQAAAAEAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmW1kaWEAAAAgbWRoZAAAAABZJ1fXWSdX1wAA+gAAAAEAAAA1VxAAAAAhaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvAAAAAI9taW5mAAAAFHZtaGQAAAAAAAACAAAAAAAhZGlbmQAAAAx1cmwgAAAAAQAAAAEAAABxYmJsdQAAAFxzdHNkAAAAAAAAAAEAAABMbXA0dgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAAAZ//8AAAAxYXZjQwH0AAr/4QAZZ/QACq609NQYBAAAAAACABhzcDl4AAAAZHV1aWRraHpH1cxLq7Nzk3OyK/N3tQAAAAx1c210AAAAAFRtdGDTLM%2F2AAEAADEAAAAAAAAAAAAAAAAsAAAAAQAAABlzdHNzAAAAAAAAAAEAAAABAAAAFHN0dHMAAAAAAAAAAQAAAAEAAAD6c3RzYwAAAAAAAAABAAAAAQAAAAEAAAAUc3R6MAAAAAAAAAABAAAAGHN0Y28AAAAAAAAAAQAAADAAAAAAY3R0cwAAAAAAAAABAAAAAQAAABAAAAA=";

  await page.setContent(`
    <html>
      <body>
        <div id="host1"></div>
        <div id="host2"></div>

        <script>
          const src = "${videoSrc}";

          // Simple Shadow Component
          class TestComponent extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }

            connectedCallback() {
              const v1 = document.createElement('video');
              v1.id = 'shadow-v1';
              v1.src = src;
              v1.setAttribute('data-helios-offset', '2');

              const v2 = document.createElement('video');
              v2.id = 'shadow-v2';
              v2.src = src;
              v2.setAttribute('data-helios-seek', '5');

              this.shadowRoot.appendChild(v1);
              this.shadowRoot.appendChild(v2);
            }
          }
          customElements.define('test-component', TestComponent);

          document.getElementById('host1').appendChild(new TestComponent());

          // Nested Shadow Component
          class NestedComponent extends HTMLElement {
             constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const child = new TestComponent();
                this.shadowRoot.appendChild(child);
            }
          }
          customElements.define('nested-component', NestedComponent);

          document.getElementById('host2').appendChild(new NestedComponent());
        </script>
      </body>
    </html>
  `);

  const driver = new CdpTimeDriver();

  // NOTE: CdpTimeDriver.prepare() pauses virtual time immediately.
  await driver.prepare(page);

  // Helper to get current times
  const getTimes = async () => {
    return page.evaluate(`
      (() => {
        // Helper to traverse
        const getShadowVideoTime = (hostId, videoId) => {
          const host = document.getElementById(hostId);
          const el = host.children[0]; // test-component or nested-component

          if (hostId === 'host1') {
              const target = el.shadowRoot.querySelector('#' + videoId);
              return target ? target.currentTime : -1;
          } else {
               // Nested: host -> nested-component -> shadow -> test-component -> shadow -> video
               const nested = el.shadowRoot.querySelector('test-component');
               const target = nested.shadowRoot.querySelector('#' + videoId);
               return target ? target.currentTime : -1;
          }
        };

        return {
          shadowV1: getShadowVideoTime('host1', 'shadow-v1'),
          shadowV2: getShadowVideoTime('host1', 'shadow-v2'),
          nestedV1: getShadowVideoTime('host2', 'shadow-v1'),
          nestedV2: getShadowVideoTime('host2', 'shadow-v2'),
        };
      })()
    `);
  };

  console.log('Testing t=1.0...');
  await driver.setTime(page, 1.0);

  let times: any = await getTimes();

  // Logic matches verify-cdp-media-offsets.ts
  // v1: offset=2. t=1 -> 1-2 = -1 -> 0
  // v2: seek=5. t=1 -> 1+5 = 6

  const isClose = (a: number, b: number) => Math.abs(a - b) < 0.1;

  console.log('Results at t=1.0:', times);

  if (!isClose(times.shadowV1, 0)) throw new Error(`shadowV1 at t=1.0 failed: expected 0, got ${times.shadowV1}`);
  if (!isClose(times.shadowV2, 6)) throw new Error(`shadowV2 at t=1.0 failed: expected 6, got ${times.shadowV2}`);
  if (!isClose(times.nestedV1, 0)) throw new Error(`nestedV1 at t=1.0 failed: expected 0, got ${times.nestedV1}`);
  if (!isClose(times.nestedV2, 6)) throw new Error(`nestedV2 at t=1.0 failed: expected 6, got ${times.nestedV2}`);

  console.log('Testing t=3.0...');
  await driver.setTime(page, 3.0);

  times = await getTimes();

  // v1: offset=2. t=3 -> 3-2 = 1
  // v2: seek=5. t=3 -> 3+5 = 8

  console.log('Results at t=3.0:', times);

  if (!isClose(times.shadowV1, 1)) throw new Error(`shadowV1 at t=3.0 failed: expected 1, got ${times.shadowV1}`);
  if (!isClose(times.shadowV2, 8)) throw new Error(`shadowV2 at t=3.0 failed: expected 8, got ${times.shadowV2}`);
  if (!isClose(times.nestedV1, 1)) throw new Error(`nestedV1 at t=3.0 failed: expected 1, got ${times.nestedV1}`);
  if (!isClose(times.nestedV2, 8)) throw new Error(`nestedV2 at t=3.0 failed: expected 8, got ${times.nestedV2}`);

  console.log('✅ SUCCESS: CdpTimeDriver respects offsets and seeks in Shadow DOM.');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
