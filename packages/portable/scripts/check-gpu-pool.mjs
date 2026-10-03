import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Pool integration checks require macOS arm64');
const scratch = mkdtempSync(join(tmpdir(), 'helios-gpu-pool-faults-'));
writeFileSync(join(scratch, 'run.json'), JSON.stringify({ status: 'running', scratch }));
const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
const source = fileURLToPath(new URL('../native/fault-pool.mm', import.meta.url));
const sdk = spawnSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' });
if (sdk.status !== 0) throw new Error('Apple SDK unavailable');
const messages = [JSON.stringify({ fonts: {} })];
for (let frame = 0; frame < 12; frame++) messages.push(JSON.stringify({ background: [0, 0, 0, 1], commands: [{ op: 'circle', args: [32 + frame, 48, 24], matrix: [1, 0, 0, 1, 0, 0], color: [1, 0, 0, 1] }] }));
const receipts = [];
for (const kind of ['SYNC', 'DELAY', 'DUPLICATE', 'ORDER', 'DROP', 'ERROR']) {
  const library = join(scratch, `${kind.toLowerCase()}.dylib`), trace = join(scratch, `${kind.toLowerCase()}.jsonl`);
  const build = spawnSync('xcrun', ['clang++', '-std=c++17', '-dynamiclib', '-fobjc-arc', '-isysroot', sdk.stdout.trim(), `-DHELIOS_POOL_${kind}`, source, '-framework', 'VideoToolbox', '-framework', 'CoreMedia', '-o', library], { encoding: 'utf8' });
  if (build.status !== 0) throw new Error(`Fault driver build failed: ${build.stderr}`);
  const result = spawnSync('/usr/bin/env', [`DYLD_INSERT_LIBRARIES=${library}`, helper, 'encode', '320', '180', '30', '1', '4000000', join(scratch, `${kind.toLowerCase()}.h264`), trace, '', '30', '3'], { input: messages.join('\n') + '\n', encoding: 'utf8', timeout: 10000 });
  writeFileSync(join(scratch, `${kind.toLowerCase()}.stdout`), result.stdout ?? ''); writeFileSync(join(scratch, `${kind.toLowerCase()}.stderr`), result.stderr ?? '');
  const shouldPass = kind === 'SYNC' || kind === 'DELAY';
  const passed = !result.error && result.status === (shouldPass ? 0 : 1) && (shouldPass ? JSON.parse(result.stdout).frames === 12 : !result.stdout && /GPU_ENCODE_FAILED|GPU_ENCODER_DRAIN_FAILED/.test(result.stderr));
  const rows = readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  receipts.push({ kind, passed, status: result.status, error: result.error?.message, finalDrain: rows.find(row => row.event === 'encoder-finish'), backpressure: rows.filter(row => row.event === 'pool-backpressure').length });
}
const report = { scratch, receipts }; console.log(JSON.stringify(report));
writeFileSync(join(scratch, 'run.json'), JSON.stringify(report));
if (receipts.some(receipt => !receipt.passed)) process.exitCode = 1;
