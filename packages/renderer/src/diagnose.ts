import { chromium } from 'playwright';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';

export async function diagnose() {
  console.log('--- Helios Diagnostics ---');

  // 1. Check FFmpeg
  console.log('\n[1/3] Checking FFmpeg...');
  try {
    const ffmpegPath = ffmpeg.path;
    if (fs.existsSync(ffmpegPath)) {
        console.log(`✅ FFmpeg found at: ${ffmpegPath}`);
    } else {
        console.error(`❌ FFmpeg path returned by installer does not exist: ${ffmpegPath}`);
    }
  } catch (e) {
      console.error('❌ Error checking FFmpeg:', e);
  }

  // 2. Check Playwright Browser
  console.log('\n[2/3] Checking Playwright Browser...');
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--use-gl=egl',
            '--ignore-gpu-blocklist',
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
        ]
    });
    console.log(`✅ Browser launched successfully (Version: ${browser.version()})`);

    // 3. Check GPU (Advanced)
    console.log('\n[3/3] Checking GPU Status (chrome://gpu)...');
    try {
        const page = await browser.newPage();
        await page.goto('chrome://gpu');

        // Simple check: Look for "Hardware accelerated" in the text
        const text = await page.locator('body').innerText();
        const acceleratedCount = (text.match(/Hardware accelerated/g) || []).length;

        if (acceleratedCount > 0) {
             console.log(`✅ GPU Acceleration detected (${acceleratedCount} references found on chrome://gpu)`);
        } else {
             console.log('⚠️  No explicit "Hardware accelerated" text found on chrome://gpu. This might be expected in some headless environments.');
        }

        // Optional: Dump some specific info if needed
        // console.log(text.substring(0, 500));

        await page.close();
    } catch (e) {
        console.error('⚠️  Failed to check chrome://gpu:', e);
    }

    await browser.close();

  } catch (e: any) {
    console.error('❌ Failed to launch Playwright browser.');
    console.error('Error details:', e.message);
    console.log('Suggestion: Run "npx playwright install"');
  }

  console.log('\n--- Diagnostics Complete ---');
}

// Allow running directly
if (require.main === module) {
    diagnose().catch(err => {
        console.error('Unhandled error in diagnose:', err);
        process.exit(1);
    });
}
