#!/bin/bash
cd packages/renderer
npx tsx tests/fixtures/benchmark.ts > run.log 2>&1
grep "^render_time_s:\|peak_mem_mb:\|fps_effective:" run.log
