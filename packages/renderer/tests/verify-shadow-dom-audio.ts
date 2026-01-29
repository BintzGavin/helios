import { chromium, Route } from 'playwright';
import { DomStrategy } from '../src/strategies/DomStrategy';
import { RendererOptions } from '../src/types';

async function verify() {
  console.log('Verifying Shadow DOM Audio Discovery...');

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Intercept requests
  await page.route('**/*.mp3', (route: Route) => route.fulfill({ status: 200, body: 'dummy audio' }));

  // Create a page with a Custom Element containing a Shadow Root with an audio element
  await page.setContent(`
    <html>
      <body>
        <script>
          class AudioComponent extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
              this.shadowRoot.innerHTML = '<audio src="https://example.com/shadow-audio.mp3" controls></audio>';
            }
          }
          customElements.define('audio-component', AudioComponent);
        </script>
        <audio-component></audio-component>
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
  await strategy.prepare(page);

  console.log('Getting FFmpeg args...');
  const args = strategy.getFFmpegArgs(options, 'output.mp4');

  console.log('FFmpeg Args:', args);

  // Check if the audio file from the Shadow DOM is present in the FFmpeg arguments
  const hasShadowAudio = args.includes('https://example.com/shadow-audio.mp3');

  await browser.close();

  if (hasShadowAudio) {
    console.log('✅ Found shadow-audio.mp3');
    console.log('✅ Verification Passed');
    process.exit(0);
  } else {
    console.error('❌ Failed: Expected https://example.com/shadow-audio.mp3 to be in args');
    console.error('❌ Verification Failed');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
