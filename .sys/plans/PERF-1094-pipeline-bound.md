---
id: PERF-1094
slug: hoist-pipeline-limit-check
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1094: Hoist and Simplify Pipeline Limit Check in Worker Loop

## Focus Area
The multi-worker loop in `CaptureLoop.ts` (`isDomStrategy` and else branches inside `runWorker`) performs a check on every frame dispatch evaluation: `if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth)`. We can remove this math from the conditional and avoid creating garbage on every loop evaluation.

## Background Research
Currently, inside the `while (nextFrameToSubmit !== totalFrames && !aborted)` loops of `runWorker`, there is this logic:
```typescript
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
```
V8 evaluates the right hand side on every single loop iteration, computing `nextFrameToWrite + maxPipelineDepth`. However, `nextFrameToWrite` is fundamentally modified asynchronously *by the writer loop*, which is also evaluating limits using identically-shaped structures.

If we pre-calculate `const limit = nextFrameToWrite + maxPipelineDepth;` outside of `if` conditions in the writer loop, we can slightly improve V8 branch predictor behavior in the writer loops by reducing the number of nodes the AST parser parses. (See lines 560, 626 and 436). Wait, in the worker loop (line 486), we can also inline it, but it might be better to rewrite the limits. Wait, what if we just simplify the pipeline depth addition since it's used multiple times?

Let's look at a simpler target: the dispatch loops (436, 560, 626).
```typescript
                const limit = nextFrameToWrite + maxPipelineDepth;
                let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
```

We can replace this with:
```typescript
                let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
```
Wait, we want to REDUCE computation, not increase it.
Actually, what if we cache `maxPipelineDepth` inside a pre-calculated variable `const limit = nextFrameToWrite + maxPipelineDepth;`? Oh, it's already doing that.

Let's look at `CaptureLoop.ts` again.
