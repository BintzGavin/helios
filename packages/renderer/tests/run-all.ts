import { spawnSync } from 'child_process';
import * as path from 'path';

const tests = [
  'tests/verify-seek-driver-determinism.ts',
  'tests/verify-media-sync.ts',
  'tests/verify-smart-codec-selection.ts',
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
