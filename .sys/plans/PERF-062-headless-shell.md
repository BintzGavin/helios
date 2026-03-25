---
id: PERF-062
slug: headless-shell
status: unclaimed
claimed_by: ""
created: 2024-03-25
completed: ""
result: ""
---

# PERF-062: Headless Shell Exploration

## Focus Area
Browser Launch in `packages/renderer/src/Renderer.ts`

## Background Research
We've observed that modifying GPU disabled args decreases performance. We should instead focus on other flags. The journal indicates `--headless=new` was tried and failed. However, Playwright's default headless mode (the old headless shell) might still be optimizable.

## Benchmark Configuration
- **Composition URL**: A standard DOM benchmark composition (e.g. `packages/renderer/tests/verify-dom-selector.ts`).
- **Render Settings**: 1920x1080, 60 FPS, 5 seconds duration, `libx264` codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.221s
- **Bottleneck analysis**: The microVM CPU is heavily saturated.

## Implementation Spec

### Step 1: Optimize Playwright Launch Args
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In `Renderer.ts`, try adding aggressive CPU saving flags to `DEFAULT_BROWSER_ARGS` such as `--disable-features=IsolateOrigins,site-per-process`, `--disable-site-isolation-trials`, and `--disable-ipc-flooding-protection`.
**Why**: Site isolation is heavy and we don't need it for rendering local files.
**Risk**: Might cause instability or be ignored in headless mode.

### Step 2: Verify the change locally
Run the following targeted verification scripts to establish the new baseline and ensure no regressions occur:
- `npx tsx packages/renderer/tests/verify-seek-driver-offsets.ts`
- `npx tsx packages/renderer/tests/verify-dom-selector.ts`

## Correctness Check
Run the DOM selector verification script:
`npx tsx packages/renderer/tests/verify-dom-selector.ts`
All tests should pass without hanging and CSS rendering should remain intact.
