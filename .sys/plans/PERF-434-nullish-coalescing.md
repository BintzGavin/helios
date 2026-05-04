---
id: PERF-434
slug: nullish-coalescing
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-434: Eliminate Truthiness Check Allocations in DomStrategy Capture Loop

## Context & Goal
In the `DomStrategy.ts` capture hot loop, `handleBeginFrameSuccess` uses a truthiness fallback `result.screenshotData || this.lastFrameData!`. In V8, the logical OR `||` operator forces a `ToBoolean` type coercion on the left operand. For strings (like `screenshotData`), it has to verify if the string is non-empty, involving execution overhead on every frame.

By replacing `||` with the nullish coalescing operator `??`, V8 only performs a direct check for `null` or `undefined`. Because `result.screenshotData` is guaranteed to be a string or undefined in the CDP protocol, this simple check avoids type coercion and minor execution overhead in the tight rendering loop.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Architecture
Modify the `handleBeginFrameSuccess` callback in `DomStrategy.ts` to use nullish coalescing.

### Pseudo-Code
```typescript
// packages/renderer/src/strategies/DomStrategy.ts
// Change:
private handleBeginFrameSuccess = (result: any) => {
  const frameData = result.screenshotData || this.lastFrameData!;
  this.lastFrameData = frameData;
  return frameData;
};

// To:
private handleBeginFrameSuccess = (result: any) => {
  const frameData = result.screenshotData ?? this.lastFrameData!;
  this.lastFrameData = frameData;
  return frameData;
};
```

### Public API Changes
None

### Dependencies
None

## Test Plan
- Run `cd packages/renderer && npx tsx tests/verify-dom-strategy-capture.ts`.
