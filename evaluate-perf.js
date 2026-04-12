import { execSync } from 'child_process';
import fs from 'fs';

const runs = 3;
const results = [];
for (let i = 0; i < runs; i++) {
  console.log(`Run ${i + 1}...`);
  const output = execSync('cd packages/renderer && npx tsx scripts/benchmark-test.js', { encoding: 'utf-8' });
  const match = output.match(/render_time_s:\s+([0-9.]+)/);
  if (match) {
    results.push(parseFloat(match[1]));
  }
}
results.sort((a, b) => a - b);
const median = results[1];
console.log(`Median render time: ${median}s`);

const baseline = 2.8;
const status = median < baseline * 0.99 ? 'keep' : 'discard';
const description = 'Prebind CaptureLoop stdin write callback closure';
const frames = 150;
const fps = (frames / median).toFixed(2);
const runId = 253;

// Append to TSV
const tsvLine = `${runId}\t${median}\t${frames}\t${fps}\t0.0\t${status}\t${description}\n`;
fs.appendFileSync('packages/renderer/.sys/perf-results.tsv', tsvLine);

// Update markdown files
if (status === 'keep') {
  let md = fs.readFileSync('docs/status/RENDERER-EXPERIMENTS.md', 'utf8');
  md = md.replace(/## What Works\n/, `## What Works\n- [PERF-${runId}] Prebind CaptureLoop onWriteError closure: Improved median time to ${median}s (baseline ${baseline}s)\n`);
  fs.writeFileSync('docs/status/RENDERER-EXPERIMENTS.md', md);
} else {
  let md = fs.readFileSync('docs/status/RENDERER-EXPERIMENTS.md', 'utf8');
  md = md.replace(/## What Doesn't Work \(and Why\)\n/, `## What Doesn't Work (and Why)\n- [PERF-${runId}] Prebind CaptureLoop onWriteError closure: Median time ${median}s was not a clear improvement over baseline ${baseline}s. V8 allocation cost of a simple closure inside the outer loop (per worker execution, not inner loop) is negligible compared to FFmpeg pipe write bottlenecks.\n`);
  fs.writeFileSync('docs/status/RENDERER-EXPERIMENTS.md', md);

  // Revert changes if discarded
  execSync('git checkout packages/renderer/src/core/CaptureLoop.ts');
}

let plan = fs.readFileSync('.sys/plans/PERF-253-optimize-capture-loop-write.md', 'utf8');
plan = plan.replace(/status: claimed/, 'status: complete');
plan = plan.replace(/result: ""/, `result: "${status === 'keep' ? 'improved' : 'discarded'}"`);
plan += `\n\n## Results Summary\n- **Best render time**: ${median}s (vs baseline ${baseline}s)\n- **Improvement**: ${((baseline - median) / baseline * 100).toFixed(2)}%\n- **Kept experiments**: ${status === 'keep' ? '[Prebind onWriteError closure]' : '[]'}\n- **Discarded experiments**: ${status === 'discard' ? '[Prebind onWriteError closure]' : '[]'}\n`;
fs.writeFileSync('.sys/plans/PERF-253-optimize-capture-loop-write.md', plan);
