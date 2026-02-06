import { spawnSync } from 'child_process';
import * as path from 'path';

const tests = [
  'tests/verify-audio-codecs.ts',
  'tests/verify-audio-fades.ts',
  'tests/verify-audio-loop.ts',
  'tests/verify-audio-playback-rate.ts',
  'tests/verify-audio-playback-seek.ts',
  'tests/verify-bitrate.ts',
  'tests/verify-blob-audio.ts',
  'tests/verify-browser-config.ts',
  'tests/verify-canvas-implicit-audio.ts',
  'tests/verify-canvas-selector.ts',
  'tests/verify-canvas-shadow-dom.ts',
  'tests/verify-canvas-strategy.ts',
  'tests/verify-captions.ts',
  'tests/verify-cdp-determinism.ts',
  'tests/verify-cdp-driver.ts',
  'tests/verify-cdp-driver-stability.ts',
  'tests/verify-cdp-driver-timeout.ts',
  'tests/verify-cdp-hang.ts',
  'tests/verify-cdp-media-offsets.ts',
  'tests/verify-cdp-media-sync-timing.ts',
  'tests/verify-cdp-shadow-dom-sync.ts',
  'tests/verify-codec-validation.ts',
  'tests/verify-codecs.ts',
  'tests/verify-concat.ts',
  'tests/verify-deep-dom.ts',
  'tests/verify-distributed.ts',
  'tests/verify-distributed-cancellation.ts',
  'tests/verify-diagnose.ts',
  'tests/verify-diagnose-ffmpeg.ts',
  'tests/verify-dom-audio-fades.ts',
  'tests/verify-dom-media-attributes.ts',
  'tests/verify-dom-transparency.ts',
  'tests/verify-enhanced-dom-preload.ts',
  'tests/verify-frame-count.ts',
  'tests/verify-iframe-sync.ts',
  'tests/verify-implicit-audio.ts',
  'tests/verify-keyframes.ts',
  'tests/verify-media-sync.ts',
  'tests/verify-pseudo-element-preload.ts',
  'tests/verify-range-render.ts',
  'tests/verify-seek-driver-determinism.ts',
  'tests/verify-seek-driver-offsets.ts',
  'tests/verify-seek-driver-stability.ts',
  'tests/verify-shadow-dom-animations.ts',
  'tests/verify-shadow-dom-audio.ts',
  'tests/verify-shadow-dom-background.ts',
  'tests/verify-shadow-dom-images.ts',
  'tests/verify-shadow-dom-sync.ts',
  'tests/verify-smart-audio-fades.ts',
  'tests/verify-smart-codec-priority.ts',
  'tests/verify-smart-codec-selection.ts',
  'tests/verify-stream-copy.ts',
  'tests/verify-video-loop.ts',
  'tests/verify-virtual-time-binding.ts',
  'tests/verify-visual-playback-rate.ts',
  'tests/verify-waapi-sync.ts',
  'scripts/verify-advanced-audio.ts',
  'scripts/verify-audio-args.ts',
  'scripts/verify-audio-mixing.ts',
  'scripts/verify-dom-media-preload.ts',
  'scripts/verify-dom-preload.ts',
  'scripts/verify-error-handling.ts',
  'scripts/verify-transparency.ts',
  'scripts/verify-cancellation.ts',
  'scripts/verify-trace.ts',
  'scripts/verify-ffmpeg-path.ts',
];

console.log('Running Renderer Verification Suite...');

let failures = 0;

for (const testFile of tests) {
  console.log(`\n---------------------------------------------------------`);
  console.log(`Running: ${testFile}`);
  console.log(`---------------------------------------------------------`);

  // We assume we are running from packages/renderer root
  // using tsx instead of ts-node for better ESM/CJS interop
  const result = spawnSync('npx', ['tsx', testFile], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌ FAILED: ${testFile} (Exit Code: ${result.status})`);
    failures++;
  } else {
    console.log(`\n✅ PASSED: ${testFile}`);
  }
}

console.log(`\n---------------------------------------------------------`);
if (failures > 0) {
  console.error(`SUMMARY: ${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`SUMMARY: All tests passed.`);
  process.exit(0);
}
