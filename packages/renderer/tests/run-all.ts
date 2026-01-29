import { spawnSync } from 'child_process';
import * as path from 'path';

const tests = [
  'tests/verify-audio-codecs.ts',
  'tests/verify-bitrate.ts',
  'tests/verify-canvas-strategy.ts',
  'tests/verify-captions.ts',
  'tests/verify-cdp-driver.ts',
  'tests/verify-cdp-driver-stability.ts',
  'tests/verify-codecs.ts',
  'tests/verify-concat.ts',
  'tests/verify-deep-dom.ts',
  'tests/verify-diagnose.ts',
  'tests/verify-diagnose-ffmpeg.ts',
  'tests/verify-dom-media-attributes.ts',
  'tests/verify-dom-transparency.ts',
  'tests/verify-iframe-sync.ts',
  'tests/verify-implicit-audio.ts',
  'tests/verify-media-sync.ts',
  'tests/verify-range-render.ts',
  'tests/verify-seek-driver-determinism.ts',
  'tests/verify-seek-driver-offsets.ts',
  'tests/verify-seek-driver-stability.ts',
  'tests/verify-smart-codec-selection.ts',
  'tests/verify-stream-copy.ts',
  'scripts/verify-error-handling.ts',
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
