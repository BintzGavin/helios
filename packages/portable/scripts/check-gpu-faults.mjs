import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin' || process.arch !== 'arm64') { console.error('GPU fault checks require supported macOS arm64 hardware.'); process.exit(1); }
const scratch = mkdtempSync(join(tmpdir(), 'helios-gpu-faults-'));
const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
const source = fileURLToPath(new URL('../native/fault-init.mm', import.meta.url));
const sdk = spawnSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' });
if (sdk.status !== 0) throw new Error('Apple SDK unavailable');
const receipts = [];
for (const kind of ['DEVICE', 'ENCODER']) {
  const library = join(scratch, `${kind.toLowerCase()}.dylib`);
  const build = spawnSync('xcrun', ['clang++', '-dynamiclib', '-fobjc-arc', '-isysroot', sdk.stdout.trim(), `-DHELIOS_FAIL_${kind}`, source, '-framework', 'Metal', '-framework', 'VideoToolbox', '-o', library], { encoding: 'utf8' });
  if (build.status !== 0) throw new Error(`Fault driver build failed: ${build.stderr}`);
  const result = spawnSync('/usr/bin/env', [`DYLD_INSERT_LIBRARIES=${library}`, helper, 'probe'], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 1 || !result.stderr.includes('GPU_INIT_FAILED') || result.stdout) throw new Error(`GPU ${kind.toLowerCase()} failure did not fail closed`);
  receipts.push({ fault: kind.toLowerCase(), exit: result.status, refused: true, softwareFallback: false });
}
console.log(JSON.stringify({ scratch, receipts }));
