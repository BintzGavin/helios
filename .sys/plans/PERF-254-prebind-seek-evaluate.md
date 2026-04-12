---
id: PERF-254
slug: prebind-seek-evaluate
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---
# PERF-254: Pre-bind evaluate closures in SeekTimeDriver

1. Context & Goal
The `SeekTimeDriver` handles setting the virtual time on the page and then evaluating an inline closure on every page frame to sync media and wait for stability. By pre-binding the inline closure to a class property `this.evaluateClosure`, we eliminate the V8 garbage collection overhead of allocating an anonymous function on every frame in the `setTime` hot loop. The goal is to reduce per-frame GC pauses.

2. File Inventory
- `packages/renderer/src/drivers/SeekTimeDriver.ts`

3. Implementation Spec
- **Architecture**: Move the anonymous closure `([t, timeoutMs]) => { (window as any).__helios_seek(t, timeoutMs); }` into a class property `private evaluateClosure = ([t, timeoutMs]: any) => { (window as any).__helios_seek(t, timeoutMs); };`.
- **Pseudo-Code**:
  ```typescript
  private evaluateClosure = ([t, timeoutMs]: any) => { (window as any).__helios_seek(t, timeoutMs); };
  // ... in setTime ...
  return frames[0].evaluate(this.evaluateClosure, this.evaluateArgs);
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

4. Test Plan
- Run `benchmark-test.js` to measure CPU render time.
- Verify correctness using standard CDP determinism, driver, and stability tests.
