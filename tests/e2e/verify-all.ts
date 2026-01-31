import { spawnSync } from 'child_process';

console.log('🚀 Starting Full E2E Verification Pipeline...');

// 0. Build Dependencies
console.log('\n🏗️ Step 0: Building Dependencies (Core, Renderer)...');
const buildCore = spawnSync('npm', ['run', 'build', '-w', 'packages/core'], { stdio: 'inherit', shell: true });
if (buildCore.status !== 0) { console.error('❌ Core Build failed!'); process.exit(1); }

const buildRenderer = spawnSync('npm', ['run', 'build', '-w', 'packages/renderer'], { stdio: 'inherit', shell: true });
if (buildRenderer.status !== 0) { console.error('❌ Renderer Build failed!'); process.exit(1); }

// 1. Build Examples
console.log('\n📦 Step 1: Building Examples...');
const build = spawnSync('npm', ['run', 'build:examples'], {
  stdio: 'inherit',
  shell: true,
});

if (build.status !== 0) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// 2. Verify Server-Side Rendering (Renderer Class)
console.log('\n🎥 Step 2: Verifying Server-Side Rendering...');
const verifyRender = spawnSync('npx', ['tsx', 'tests/e2e/verify-render.ts'], {
  stdio: 'inherit',
  shell: true,
});

if (verifyRender.status !== 0) {
  console.error('❌ Server-Side Verification failed!');
  process.exit(1);
}

// 3. Verify Client-Side Export (Browser Automation)
console.log('\n🌐 Step 3: Verifying Client-Side Export...');
const verifyClient = spawnSync('npx', ['tsx', 'tests/e2e/verify-client-export.ts'], {
  stdio: 'inherit',
  shell: true,
});

if (verifyClient.status !== 0) {
  console.error('❌ Client-Side Verification failed!');
  process.exit(1);
}

console.log('\n✅ All verifications passed successfully!');
process.exit(0);
