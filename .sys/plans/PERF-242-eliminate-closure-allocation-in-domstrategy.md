---
id: PERF-242
slug: eliminate-closure-allocation-in-domstrategy
status: unclaimed
claimed_by: ""
created: "2026-04-11"
completed: "2026-04-11"
result: "improved"
---

# PERF-242: Eliminate closure allocation in DomStrategy capture

## Focus Area
DOM Rendering Pipeline - CDP Message Result Handling in `DomStrategy.ts`.

## Background Research
In the `DomStrategy.capture` method, which is called for every frame in the hot loop, we allocate an anonymous closure to handle the `HeadlessExperimental.beginFrame` CDP response:

```typescript
    return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams) as Promise<any>).then((res) => {
      if (res && res.screenshotData) {
        this.lastFrameData = res.screenshotData;
        return res.screenshotData;
      } else if (this.lastFrameData) {
        return this.lastFrameData;
      } else {
        this.lastFrameData = this.emptyImageBase64;
        return this.emptyImageBase64;
      }
    });
```

Because `capture()` is invoked thousands of times during a single video render, V8 is forced to allocate a new function object and lexical closure environment on every frame, creating unnecessary garbage collection pressure and micro-stalls.

Previously, `PERF-138` attempted to extract this logic into an arrow function class property, but it was discarded due to crashing. The likely reason was that `PERF-138` used object destructuring `({ screenshotData }: any)` for the CDP response, which throws an exception when the CDP command returns `null` or a completely empty object.

We can safely eliminate the per-frame closure allocation by caching a bound callback `handleBeginFrameResult` in the constructor and passing the reference to `.then()`, ensuring we avoid unsafe destructuring of the response.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.082s
- **Bottleneck analysis**: V8 heap allocations for the `.then()` handler closure per frame.

## Implementation Spec

### Step 1: Pre-bind the CDP response handler
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add a bound property `handleBeginFrameResult` to `DomStrategy` class below the class variables:
```typescript
<<<<<<< SEARCH
  private frameInterval: number = 0;

  constructor(private options: RendererOptions) {
=======
  private frameInterval: number = 0;

  private handleBeginFrameResult = (res: any) => {
    if (res && res.screenshotData) {
      this.lastFrameData = res.screenshotData;
      return res.screenshotData;
    } else if (this.lastFrameData) {
      return this.lastFrameData;
    } else {
      this.lastFrameData = this.emptyImageBase64;
      return this.emptyImageBase64;
    }
  };

  constructor(private options: RendererOptions) {
>>>>>>> REPLACE
```

2. In `capture()`, replace `.then((res) => { ... })` with `.then(this.handleBeginFrameResult)` for both the targeted and non-targeted code paths.

Targeted path:
```typescript
<<<<<<< SEARCH
        return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams) as Promise<any>).then((res) => {
          if (res && res.screenshotData) {
            this.lastFrameData = res.screenshotData;
            return res.screenshotData;
          } else if (this.lastFrameData) {
            return this.lastFrameData;
          } else {
            this.lastFrameData = this.emptyImageBase64;
            return this.emptyImageBase64;
          }
        });
=======
        return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams) as Promise<any>).then(this.handleBeginFrameResult);
>>>>>>> REPLACE
```

Non-targeted path:
```typescript
<<<<<<< SEARCH
    return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams) as Promise<any>).then((res) => {
      if (res && res.screenshotData) {
        this.lastFrameData = res.screenshotData;
        return res.screenshotData;
      } else if (this.lastFrameData) {
        return this.lastFrameData;
      } else {
        this.lastFrameData = this.emptyImageBase64;
        return this.emptyImageBase64;
      }
    });
=======
    return (this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams) as Promise<any>).then(this.handleBeginFrameResult);
>>>>>>> REPLACE
```

**Why**: Reuses the exact same bound instance method reference across all frames, completely eliminating anonymous closure heap allocation per frame. Since the arrow function property captures `this` on instantiation (once per `DomStrategy`, meaning once per worker), there are no binding overheads or GC concerns.

## Variations
None.

## Correctness Check
Run the `verify-dom-strategy-capture` test or standard DOM integration test to ensure frames are still correctly parsed and processed from the CDP result.

## Prior Art
- PERF-138 (attempted closure elimination with unsafe destructuring)

## Results Summary
- **Kept experiments**: Eliminated closure allocation in DomStrategy
