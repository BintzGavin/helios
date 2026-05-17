---
id: PERF-534
slug: remove-disable-breakpad
status: complete
claimed_by: "executor"
created: 2024-05-17
completed: "2024-05-17"
result: "failed"
---

# PERF-534: Remove --disable-breakpad from Chromium arguments

## Focus Area
`packages/renderer/src/core/BrowserPool.ts` - Browser launch arguments.

## Background Research
Currently, the `BrowserPool` launches Chromium with the `--disable-breakpad` flag as part of its `DEFAULT_BROWSER_ARGS`. As we systematically test the impact of launch configurations on the median render time, this experiment will remove this specific flag to determine if its presence has any measurable impact on the `HeadlessExperimental.beginFrame` hot loop performance in our CPU-bound microVM environment.

## Benchmark Configuration
- **Composition URL**: Standard benchmark (Simple Animation)
- **Render Settings**: 600 frames, mode dom, 1920x1080 60FPS
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~15.594s
- **Bottleneck analysis**: Systematic verification of default Chromium flags.

## Implementation Spec

### Step 1: Remove `--disable-breakpad` Argument
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `DEFAULT_BROWSER_ARGS` array, remove `--disable-breakpad`.

```typescript
<<<<<<< SEARCH
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-breakpad',
  '--disable-web-security',
=======
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-web-security',
>>>>>>> REPLACE
```

**Why**: To determine if the `--disable-breakpad` flag has an impact on the baseline performance in this specific environment.
**Risk**: Negligible. Crash reporting will be active, but since this is a controlled environment, it won't impact external systems.

## Variations
- N/A

## Canvas Smoke Test
Run canvas benchmarks to ensure `BrowserPool` still launches correctly.

## Correctness Check
Run the DOM benchmark and verify output video is correctly encoded. Ensure tests pass.

## Prior Art
- PERF-529 (Enabled `process-per-tab` which fundamentally changed how processes are launched).
