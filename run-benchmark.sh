#!/bin/bash
cd packages/renderer

# Clean up
rm -f run.log output.mp4

# Run build
npm run build || { echo "Build failed"; return 1; }

# Make sure examples are built
cd ../..
npm run build:examples
cd packages/renderer

# Run benchmark
npx tsx tests/fixtures/benchmark.ts > run.log 2>&1

grep "^render_time_s:\|peak_mem_mb:\|fps_effective:" run.log
