import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { createServer } from 'vite';

async function main() {
  console.log('Starting Promo Video 2 Verification...');

  // Start Vite server programmatically
  const server = await createServer({
    root: 'examples/promo-video-2',
    server: { port: 3002 }
  });
  await server.listen();
  console.log('Vite server started on port 3002');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console logs from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto('http://localhost:3002/composition.html');

    // Wait for helios to be ready
    await page.waitForFunction(() => window.helios);
    console.log('Helios detected.');

    // Helper to seek and check visibility
    const checkScene = async (time: number, selector: string, description: string) => {
      console.log(`Checking ${description} at ${time}s...`);
      const state = await page.evaluate(([t, sel]) => {
        // Use __HELIOS_VIRTUAL_TIME__ to override document.timeline
        // This prevents the composition from drifting/playing due to document.timeline.currentTime
        (window as any).__HELIOS_VIRTUAL_TIME__ = t * 1000;

        return {
          currentFrame: window.helios.currentFrame,
          time: t,
          gsapTime: window.tl ? window.tl.time() : 'no-tl',
          // Check opacity directly in browser context
          elemOpacity: document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)).opacity : 'not-found'
        };
      }, [time, selector] as [number, string]);
      console.log(`Seeked to ${state.time}, currentFrame: ${state.currentFrame}, gsapTime: ${state.gsapTime}, directOpacity: ${state.elemOpacity}`);

      // Wait a bit for GSAP to update DOM
      await page.waitForTimeout(500);

      const opacity = await page.$eval(selector, (el) => getComputedStyle(el).opacity);
      const afterState = await page.evaluate(() => ({
          currentFrame: window.helios.currentFrame,
          gsapTime: window.tl ? window.tl.time() : 'no-tl'
      }));
      console.log(`After wait: currentFrame: ${afterState.currentFrame}, gsapTime: ${afterState.gsapTime}`);
      console.log(`Opacity of ${selector}: ${opacity}`);

      if (parseFloat(opacity) > 0.5) {
        console.log(`✅ [${time}s] ${description} visible`);
      } else {
        console.error(`❌ [${time}s] ${description} NOT visible`);
        // Take screenshot
        await page.screenshot({ path: `error-${time}s.png` });
        throw new Error(`${description} failed to appear.`);
      }
    };

    // Verify Scenes
    await checkScene(1.0, '#text-scene-1', 'Scene 1 Text (Video is still built...)');
    await checkScene(3.0, '#text-scene-2 .word:nth-child(1)', 'Scene 2 Word (Rigid)');
    await checkScene(8.5, '#text-scene-3', 'Scene 3 Text (Why?)');
    await checkScene(12.0, '#text-scene-4', 'Scene 4 Text (Helios)');
    await checkScene(14.8, '.scene-5-word:nth-child(1)', 'Scene 5 Word (Not frames)');
    await checkScene(20.0, '#text-scene-6', 'Scene 6 Text (Code overlay)');
    await checkScene(24.0, '.scene-7-part:nth-child(1)', 'Scene 7 Text (From promos)');
    await checkScene(28.0, '#text-scene-8', 'Scene 8 Text (Logo)');

    console.log('✅ All scenes verified successfully.');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
    await server.close();
    console.log('Resources cleaned up.');
    process.exit(0); // Ensure exit
  }
}

main();
