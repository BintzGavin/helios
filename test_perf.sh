cd packages/renderer
node tests/fixtures/benchmark.ts > baseline.log 2>&1
cat baseline.log
