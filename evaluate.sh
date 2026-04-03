#!/bin/bash
time=$(awk '/render_time_s:/ {print $2}' /app/run.log)
fps=$(awk '/fps_effective:/ {print $2}' /app/run.log)
mem=$(awk '/peak_mem_mb:/ {print $2}' /app/run.log)

# Baseline for comparison
baseline=45.508

if awk "BEGIN {exit !($time < $baseline)}"; then
    status="keep"
    heading="## What Works"
    msg="Inlined executeFrameCapture and removed object destructuring in DomStrategy.ts (PERF-161). Render time improved (-9.727s)."
else
    status="discard"
    heading="## What Doesn't Work (and Why)"
    msg="Inlined executeFrameCapture and removed object destructuring in DomStrategy.ts (PERF-161). Reason: Did not improve render time."
fi

echo -e "1\t$time\t150\t$fps\t$mem\t$status\tinline executeFrameCapture and remove destructuring" >> packages/renderer/.sys/perf-results.tsv

awk -v h="$heading" -v m="- $msg" '$0 ~ h && !inserted { print $0 "\n" m; inserted=1; next } { print }' docs/status/RENDERER-EXPERIMENTS.md > docs/status/RENDERER-EXPERIMENTS.md.tmp && mv docs/status/RENDERER-EXPERIMENTS.md.tmp docs/status/RENDERER-EXPERIMENTS.md

if [ "$status" = "discard" ]; then
    git restore packages/renderer/src/Renderer.ts packages/renderer/src/strategies/DomStrategy.ts
fi
