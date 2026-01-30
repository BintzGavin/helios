# CORE Spec: Fix Leaky Signal Subscriptions

## 1. Context & Goal
- **Objective**: Fix the "leaky abstraction" in `Signal.subscribe` where accessing other signals inside the subscription callback causes unwanted dependency tracking.
- **Trigger**: The current implementation of `subscribe` uses `effect` internally, which tracks all signals accessed within the callback. This violates the expected behavior where a subscription should only trigger on updates to the subscribed signal.
- **Impact**: Ensures predictable state management and prevents infinite loops or redundant callback firings when users access other signals inside a subscription.

## 2. File Inventory
- **Modify**: `packages/core/src/signals.ts` (Implement `untracked` and update `subscribe` methods)
- **Modify**: `packages/core/src/signals.test.ts` (Add regression test for leaky subscriptions)

## 3. Implementation Spec
- **Architecture**: Introduce `untracked` helper to temporarily disable dependency tracking. Re-implement `subscribe` to use manual `Subscriber` management instead of `effect`, wrapping the callback execution in `untracked`.
- **Pseudo-Code**:
```typescript
export function untracked<T>(fn: () => T): T {
  const prev = activeSubscriber;
  activeSubscriber = null;
  try { return fn(); } finally { activeSubscriber = prev; }
}

class SignalImpl<T> {
   subscribe(fn: (v: T) => void) {
     const sub = {
       notify: () => untracked(() => fn(this.peek())),
       addDependency: () => {}
     };
     this.addSubscriber(sub);
     untracked(() => fn(this.peek()));
     return () => this.removeSubscriber(sub);
   }
}
// Apply similar logic to ComputedImpl
```
- **Public API Changes**: Export `untracked` function. Change behavior of `subscribe` to be non-tracking for the callback.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**: New test case "should not track dependencies in subscribe callback" passes, and all existing tests pass.
- **Edge Cases**: Nested subscriptions, subscriptions inside effects (should be fine as `untracked` restores `activeSubscriber`).
