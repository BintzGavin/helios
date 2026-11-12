---
id: PERF-1222
slug: simplify-timepromise-check
status: unclaimed
claimed_by: ""
created: 2026-11-12
completed: ""
result: ""
---

# PERF-1222: Simplify `timePromise` wait check with short-circuiting in single-worker Canvas loops

## Focus Area
`CaptureLoop.ts` - Specifically the single-worker chunk loop for non-DOM (Canvas) path. We want to reduce V8 AST execution overhead for `await timePromise`.

## Background Research
Inside `CaptureLoop.ts` around lines 263, 272, and 298 in the single-worker Canvas loop, we have blocks like this:
```typescript
          const timePromise = timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          if (timePromise) await timePromise;
```

This requires allocating a local variable `const timePromise`, evaluating an `if` block, and branching.
If we use a short-circuit expression directly, we can eliminate the local variable and the `if` block branch instruction in the JavaScript AST. By simply using `&&`, it compiles to a more compact expression without a dedicated block context.

```typescript
          const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
          timePromise && await timePromise;
```

This short-circuits to evaluate `await timePromise` only if `timePromise` is truthy, identical to the `if` block but as an expression instead of a statement, simplifying the AST. This is executed once per frame in the loop, yielding a marginal speedup by reducing AST logic. (Note: A similar simplification was performed for DOM strategy in PERF-1171 by completely removing it since DOM is fully synchronous, but Canvas still needs to handle async time promises conditionally).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-canvas-animation/composition.html`
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The Canvas strategy loop executes the time update and wait per frame. An `if` statement block evaluates as a distinct AST branching instruction, which can be marginally slower than a logical expression.

## Implementation Spec

### Step 1: Simplify initial Canvas frame timePromise check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `else` block (Canvas strategy) for the single-worker loop (around line 263).

Change this:
```typescript
          const timePromise = timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          if (timePromise) await timePromise;
```
To this:
```typescript
          const timePromise = timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          timePromise && await timePromise;
```

### Step 2: Simplify second Canvas frame timePromise check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the Canvas strategy single-worker initial block (around line 272).

Change this:
```typescript
            const timePromise = timeDriver.setTime(
              page,
              (startFrame + 1) * compTimeStep,
            );
            if (timePromise) await timePromise;
```
To this:
```typescript
            const timePromise = timeDriver.setTime(
              page,
              (startFrame + 1) * compTimeStep,
            );
            timePromise && await timePromise;
```

### Step 3: Simplify Canvas chunk loop timePromise check
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the Canvas strategy single-worker chunk loop (around line 298).

Change this:
```typescript
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
```
To this:
```typescript
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              timePromise && await timePromise;
```

**Why**: Simplifies AST into a direct logical expression, reducing TurboFan branching logic.
**Risk**: Negligible. Type coercion for logical AND matches the `if` evaluation exactly.

## Variations
We can also apply this to the multi-worker non-DOM runWorker (around line 485):
```typescript
                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                if (timePromise) await timePromise;
```
to
```typescript
                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                timePromise && await timePromise;
```
The Executor should implement this as well.

## Correctness Check
Run renderer benchmark scripts and unit tests to ensure canvas frame capturing is unaffected.
