const fs = require('fs');
const filepath = 'docs/status/RENDERER-EXPERIMENTS.md';

let content = '';
if (fs.existsSync(filepath)) {
  content = fs.readFileSync(filepath, 'utf8');
} else {
  content = `## Performance Trajectory
Current best: 4.535s (baseline was 14.430s, -68.6%)
Last updated by: PERF-1071

## What Works
- Hoisted multi-worker dispatch limits and conditionally bypassed the worker dispatch and cleanup loops in \`checkState\` and writer chunk loops (PERF-1071). Improved render time from ~14.43s to ~4.53s (~68.6% faster).

## What Doesn't Work (and Why)

## Open Questions
`;
}

if (!content.includes('PERF-1071')) {
    content = content.replace(/Current best: .*/, 'Current best: 4.535s (baseline was 14.430s, -68.6%)');
    content = content.replace(/Last updated by: .*/, 'Last updated by: PERF-1071');
    content = content.replace('## What Works\n', '## What Works\n- Hoisted multi-worker dispatch limits and conditionally bypassed the worker dispatch and cleanup loops in `checkState` and writer chunk loops (PERF-1071). Improved render time from ~14.43s to ~4.53s (~68.6% faster).\n');
}

fs.writeFileSync(filepath, content);
console.log('Journal updated');
