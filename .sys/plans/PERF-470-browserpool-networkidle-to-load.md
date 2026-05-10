---
id: PERF-470
slug: browserpool-networkidle-to-load
status: unclaimed
claimed_by: ""
created: 2024-05-10
completed: ""
result: ""
---
# PERF-470: Change BrowserPool waitUntil from networkidle to load

## Focus Area
`BrowserPool.ts` page initialization. Playwright's `networkidle` lifecycle event enforces a strict 500ms timeout penalty of no network activity before resolving, which adds a completely dead 500ms block to every renderer job. We can bypass this by using `load`.

## Background Research
When a page navigates via `page.goto()`, Playwright provides lifecycle options like `load`, `domcontentloaded`, and `networkidle`.
`networkidle` waits until there are no network connections for at least 500ms. Since the DOM benchmark composition is loaded via local file protocol (`file://`), network requests are virtually instantaneous, meaning Playwright simply blocks for an artificial 500ms waiting to confirm the idle state.
This 500ms penalty occurs synchronously inside `BrowserPool.init()` for all pages being pooled for the composition, inflating the overall job time.

Since Helios relies on `window.helios.waitUntilStable()` (which users or libraries hook into) to dictate when the application is actually ready to be captured deterministically, the `networkidle` state is not only slow but fundamentally redundant and technically unreliable for rendering complex animation lifecycles. Switching to `load` safely waits for subframes, CSS, and images to load natively, removes the 500ms dead block, and leaves animation readiness to the explicit stability hook.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: 600x600, 30fps, 5s (150 frames), dom mode
- **Metric**: Wall-clock render time in seconds (measured using scratchpad wrapping `renderer.render()`)
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.643s
- **Bottleneck analysis**: During page setup, `BrowserPool.init` sequentially initializes 3 workers and uses `page.goto` with `networkidle`. 500ms (nearly 30% of the entire pipeline time for a 150-frame animation) is wasted entirely on Playwright's 500ms idle assertion.

## Implementation Spec

### 1. Change waitUntil configuration in BrowserPool
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Use `sed` to replace `waitUntil: 'networkidle'` with `waitUntil: 'load'`.

```bash
sed -i "s/waitUntil: 'networkidle'/waitUntil: 'load'/" packages/renderer/src/core/BrowserPool.ts
```

### 2. Verify modifications to BrowserPool.ts
Run `git diff packages/renderer/src/core/BrowserPool.ts` to ensure that the sed command accurately replaced the string.

### 3. Verify compilation and benchmark render time
Run compilation and verify the performance improvement via scratchpad.
```bash
cd packages/renderer && npm run build && npx tsx scripts/perf-scratch.ts
```

### 4. Run Tests and Correctness Check
Run the core tests inside `packages/renderer` to ensure nothing is broken.
```bash
cd packages/renderer && npx tsx tests/verify-cdp-driver.ts && npx tsx tests/verify-seek-driver-determinism.ts
```
Also verify the generated `output/dom-animation.mp4` from step 3 using `ls -lh output/dom-animation.mp4` to ensure it is correctly generated.

### 5. Complete pre commit steps
Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.

### 6. Submit the change
Submit the plan via a commit and pull request.
