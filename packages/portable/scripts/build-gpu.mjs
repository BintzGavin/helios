import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  console.error('The current native GPU backend supports macOS arm64 only. Existing CPU backends remain available.');
  process.exit(1);
}
const manifest = fileURLToPath(new URL('../native/Cargo.toml', import.meta.url));
const build = spawnSync('cargo', ['build', '--release', '--locked', '--manifest-path', manifest], { stdio: 'inherit', shell: false });
if (build.error) { console.error('Rust/Cargo and Apple Command Line Tools are required to build the optional native GPU helper.'); process.exit(1); }
process.exit(build.status ?? 1);
