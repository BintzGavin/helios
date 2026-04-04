#!/bin/bash
baseline=$(cat packages/renderer/baseline.txt)
new=$(cat packages/renderer/new_baseline.txt)
frames=$(cat packages/renderer/new_2.log | grep "total_frames:" | awk '{print $2}')
fps=$(cat packages/renderer/new_2.log | grep "fps_effective:" | awk '{print $2}')
mem=$(cat packages/renderer/new_2.log | grep "peak_mem_mb:" | awk '{print $2}')
run_num=$(wc -l < packages/renderer/.sys/perf-results.tsv | awk '{print $1}')
if awk -v a="$new" -v b="$baseline" 'BEGIN { exit (a < b ? 0 : 1) }'; then
    echo -e "$run_num\t$new\t$frames\t$fps\t$mem\tkeep\teliminate destructuring and spread in capture" >> packages/renderer/.sys/perf-results.tsv
    cat << 'MARKDOWN' > docs/status/RENDERER-EXPERIMENTS.md
## Performance Trajectory
Current best: ${new}s (baseline was ${baseline}s)
Last updated by: PERF-177

## What Works
- Eliminated CDP destructuring and spread operator in hot loop (~X% faster) - PERF-177

MARKDOWN
else
    git restore packages/renderer/src/strategies/DomStrategy.ts
    echo -e "$run_num\t$new\t$frames\t$fps\t$mem\tdiscard\teliminate destructuring and spread in capture" >> packages/renderer/.sys/perf-results.tsv
    cat << 'MARKDOWN' >> docs/status/RENDERER-EXPERIMENTS.md
## What Doesn't Work (and Why)
- Eliminated CDP destructuring and spread operator in hot loop - no improvement - PERF-177
MARKDOWN
fi

cat << 'MARKDOWN' > .sys/plans/PERF-177-eliminate-destructuring.md
---
id: PERF-177
slug: eliminate-destructuring
status: complete
claimed_by: "executor-session"
created: 2024-05-28
completed: 2024-05-28
result: "kept or discarded"
---
MARKDOWN
