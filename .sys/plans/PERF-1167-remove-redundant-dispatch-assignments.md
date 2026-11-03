---
id: PERF-1167
slug: remove-redundant-dispatch-assignments
status: unclaimed
claimed_by: ""
created: 2026-11-03
completed: ""
result: ""
---

# PERF-1167: Remove redundant nextFrameToSubmit assignments in dispatchWorkers

## Focus Area
The multi-worker actor model backpressure mechanism (`dispatchWorkers` closure) in `CaptureLoop.ts`.

## Background Research
In the multi-worker paths, there's a closure `dispatchWorkers` called frequently during the hot loops. Within this closure, `nextFrameToSubmit` and `freeWorkersHead` are passed around and reassigned multiple times.

Specifically:
```typescript
const dispatchWorkers = () => {
  if (freeWorkersHead !== 0) {
    const pipelineLimit = nextFrameToWrite + maxPipelineDepth;
    let dispatches = (pipelineLimit < totalFrames ? pipelineLimit : totalFrames) - nextFrameToSubmit;
    if (dispatches > 0) {
      let h = freeWorkersHead;
      let n = nextFrameToSubmit;
      const targetH = h - (dispatches < h ? dispatches : h);
      do {
        h--;
        workerThenables[freeWorkers[h]].resolve(n);
        n++;
      } while (h !== targetH);
      freeWorkersHead = targetH;
      nextFrameToSubmit = n;
    }

    let n = nextFrameToSubmit;
    let h = freeWorkersHead;
    // If we still have waiting workers but are at totalFrames, tell them to stop
    if (n === totalFrames) {
      while (h !== 0) {
        h--;
        workerThenables[freeWorkers[h]].resolve(-1);
      }
      h = 0;
    }
    freeWorkersHead = h;
    nextFrameToSubmit = n;
  }
};
```

Notice that `freeWorkersHead` and `nextFrameToSubmit` are assigned inside the `if (dispatches > 0)` block, and then immediately re-read into local variables `h` and `n` right after. At the end of the closure, they are assigned again. By hoisting the assignments to the very end and managing the state purely with the local variables `h` and `n` throughout the closure, we can eliminate the redundant mid-closure assignments and property reads, shrinking the AST size and removing unnecessary writes.

## Benchmark Configuration
- **Composition URL**: \`file:///app/examples/dom-benchmark/composition.html\`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `dispatchWorkers` function is called hundreds of thousands of times during a full pipeline write sequence. Extra property accesses and closure writes cause a small amount of unnecessary CPU instruction bloat in V8 TurboFan.

## Implementation Spec

### Step 1: Optimize state assignments in dispatchWorkers
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
In the `dispatchWorkers` function (lines ~415 to ~445), modify the logic to only write to `freeWorkersHead` and `nextFrameToSubmit` once at the very end of the main `if` block, maintaining the state in local variables:

```typescript
const dispatchWorkers = () => {
  if (freeWorkersHead !== 0) {
    let h = freeWorkersHead;
    let n = nextFrameToSubmit;

    const pipelineLimit = nextFrameToWrite + maxPipelineDepth;
    let dispatches = (pipelineLimit < totalFrames ? pipelineLimit : totalFrames) - n;

    if (dispatches > 0) {
      const targetH = h - (dispatches < h ? dispatches : h);
      do {
        h--;
        workerThenables[freeWorkers[h]].resolve(n);
        n++;
      } while (h !== targetH);
    }

    // If we still have waiting workers but are at totalFrames, tell them to stop
    if (n === totalFrames) {
      while (h !== 0) {
        h--;
        workerThenables[freeWorkers[h]].resolve(-1);
      }
      h = 0;
    }

    freeWorkersHead = h;
    nextFrameToSubmit = n;
  }
};
```

**Why**: Consolidates loop-carried induction variables to purely local bindings during the dispatch phase, which is V8's preferred pattern for fast property assignment.
**Risk**: Standard algorithmic refactor, minimal risk. Correctness remains identical.

## Variations
None.

## Canvas Smoke Test
Run \`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` to ensure the multi-worker logic functions correctly.

## Correctness Check
Run \`npm run test --workspace=packages/renderer\` to verify rendering still works correctly.
