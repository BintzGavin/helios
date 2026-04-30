---
id: PERF-389
slug: inline-screencast-ack-params
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-389: Inline screencastFrameAck parameter allocation in DomStrategy

## Focus Area
The `DomStrategy.ts` uses `Page.screencastFrameAck` to acknowledge screencast frames on every frame.
```typescript
this.cdpSession!.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
```
This creates a new anonymous object literal `{ sessionId: event.sessionId }` on every single frame. We should test if caching this object and modifying the `sessionId` property inline reduces garbage collection pressure in the event listener.

## Background Research
In V8, creating object literals inside a hot loop (like a per-frame event listener) forces the garbage collector to clean up short-lived objects. While V8 is highly optimized for this, explicitly caching and mutating a single object in tight loops can sometimes provide a small performance gain by avoiding memory allocation and pointer churn. By pre-allocating an `ackParams` object at the class level and mutating its `sessionId` property, we can avoid the per-frame allocation.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard benchmark settings
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~36.336s
- **Bottleneck analysis**: Micro-allocations in the hot loop of the capture pipeline cause V8 GC pressure.

## Implementation Spec

### Step 1: Preallocate `ackParams`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a class property `private ackParams: { sessionId: number } = { sessionId: 0 };`.

### Step 2: Mutate instead of allocate in `Page.screencastFrame`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `prepare()`, inside the `Page.screencastFrame` listener:
```typescript
    this.cdpSession!.on('Page.screencastFrame', (event) => {
      if (this.screencastPromiseResolver) {
        this.screencastPromiseResolver(event.data);
        this.screencastPromiseResolver = null;
      }
      this.ackParams.sessionId = event.sessionId;
      this.cdpSession!.send('Page.screencastFrameAck', this.ackParams).catch(() => {});
    });
```
**Why**: Avoids dynamic object allocation on every frame, reducing V8 GC churn.
**Risk**: If Playwright's async CDP serialization reads the object later, it could read an overwritten value. However, screencast frames are sequential per worker, meaning the previous ack will be serialized before the next frame is received.

## Variations
None.

## Canvas Smoke Test
N/A

## Correctness Check
Run targeted script `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.
