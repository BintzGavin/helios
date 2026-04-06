const { execSync } = require('child_process');
try {
  execSync('git log -p packages/renderer/src/Renderer.ts | head -n 100');
} catch (e) {
  console.log(e);
}
