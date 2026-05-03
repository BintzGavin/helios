---
id: PERF-423
slug: eliminate-async-wrapper-cdp-stability
status: complete
claimed_by: ""
created: 2024-05-03
completed: ""
result: ""
---

# PERF-423: Eliminate Async Wrapper in CdpTimeDriver Stability Script

## Context & Goal
During rendering via the `CdpTimeDriver`, the driver ensures visual stability by executing `window.__helios_wait_until_stable()` via CDP `Runtime.evaluate` with `awaitPromise: true` on every single frame.

Currently, the injected script defines this function using the `async` keyword:
`window.__helios_wait_until_stable = async () => { ... await window.helios.waitUntilStable(); }`

In V8, explicitly declaring an arrow function as `async` forces the engine to instantiate and return a native `Promise` object upon execution, even if the function body evaluates synchronously (e.g., when `window.helios` is undefined, which is true for all non-Helios DOM renders). This results in an unnecessary Promise micro-allocation and garbage collection cycle per frame.

The goal is to eliminate this async wrapper. Because CDP's `Runtime.evaluate({ awaitPromise: true })` natively handles both Promise returns and synchronous primitive returns, we can remove the `async` and `await` keywords entirely. If `window.helios` exists, we return its Promise directly. If it doesn't, we return `undefined`, allowing CDP to resolve instantly without allocating a redundant V8 Promise wrapper.

## File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

## Implementation Spec

### Architecture
- Lift the `async` execution out of the wrapper function.
- Rely on CDP's native `awaitPromise: true` logic to resolve the returned synchronous or asynchronous value natively.

### Pseudo-Code
Update `window.__helios_wait_until_stable` in `CdpTimeDriver.ts` `initScript`:
```javascript
<<<<<<< SEARCH
        window.__helios_wait_until_stable = async () => {
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            await window.helios.waitUntilStable();
          }
        };
=======
        window.__helios_wait_until_stable = () => {
          if (typeof window.helios !== 'undefined' && typeof window.helios.waitUntilStable === 'function') {
            return window.helios.waitUntilStable();
          }
        };
>>>>>>> REPLACE
```

### Public API Changes
- None.

### Dependencies
- None.

## Test Plan
- Run `npx tsx packages/renderer/tests/verify-cdp-driver.ts` to ensure stability checks still function and resolve correctly.
- Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` to ensure DOM strategy pipeline still works.

## Prior Art
- PERF-368: Eliminated TimeDriver promise wrapper Node-side.
- PERF-410 & PERF-412: Optimized Promise allocations in `SeekTimeDriver` browser scripts.
## Results Summary
- **Best render time**: 48.792s (vs baseline 48.192s)
- **Improvement**: -1.2%
- **Kept experiments**: Eliminated async wrapper in CdpTimeDriver stability script
