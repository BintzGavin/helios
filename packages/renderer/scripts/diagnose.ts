import { diagnose } from '../src/diagnose';

async function main() {
  console.log('Running Helios Diagnostics...');
  const result = await diagnose();
  console.log(JSON.stringify(result, null, 2));

  if (!result.ffmpeg.exists) {
      console.error('❌ FFmpeg not found or not working.');
      process.exit(1);
  }

  if (!result.playwright.browserInstalled) {
      console.error('❌ Playwright browser not installed.');
      process.exit(1);
  }

  console.log('✅ Environment appears ready for rendering.');
}

main();
