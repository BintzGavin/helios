# 2026-02-25 - Enable Node.js Runtime Support

## 1. Context & Goal
- **Objective**: Enable `Helios` to execute `play()` and manage timing in Node.js environments without crashing.
- **Trigger**: The current default ticker (`RafTicker`) relies on `requestAnimationFrame`, causing a crash in standard Node.js environments which violates the "Headless Logic Engine" vision.
- **Impact**: Unlocks server-side logic execution, robust unit testing without JSDOM, and potential server-side rendering drivers.

## 2. File Inventory
- **Create**: `packages/core/src/drivers/TimeoutTicker.ts` - Implements a `setTimeout` based ticker.
- **Modify**: `packages/core/src/drivers/index.ts` - Export the new ticker.
- **Modify**: `packages/core/src/helios.ts` - Update constructor to auto-detect environment and select appropriate ticker.
- **Read-Only**: `packages/core/src/drivers/RafTicker.ts` - For reference.

## 3. Implementation Spec

### Architecture
Use the **Strategy Pattern** for the `Ticker` interface. The `Helios` constructor will act as a factory to select the `RafTicker` (Browser) or `TimeoutTicker` (Node) based on the presence of `requestAnimationFrame`.

### Pseudo-Code

**`packages/core/src/drivers/TimeoutTicker.ts`**
```typescript
import { Ticker, TickCallback } from './Ticker';

export class TimeoutTicker implements Ticker {
  private running = false;
  private lastTime = 0;
  private callback: TickCallback | null = null;
  private timer: NodeJS.Timeout | null = null; // Use generic any if types tricky

  start(cb: TickCallback) {
    this.running = true;
    this.callback = cb;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    this.callback = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (this.callback) {
      this.callback(dt);
    }

    if (this.running) {
        // Target ~60 FPS (16ms)
        this.timer = setTimeout(this.loop, 16);
    }
  }
}
```

**`packages/core/src/helios.ts`**
```typescript
import { TimeoutTicker } from './drivers';

// In constructor
this.ticker = options.ticker || (typeof requestAnimationFrame !== 'undefined' ? new RafTicker() : new TimeoutTicker());
```

### Public API Changes
- Export `TimeoutTicker` from `@helios-project/core`.
- `Helios` constructor no longer defaults strictly to `RafTicker` but adapts to environment.

## 4. Test Plan

### Verification
Create a new test file `packages/core/src/node-runtime.test.ts` (or add to existing if environment allows) to verify Node behavior.

**Command**: `npm test -w packages/core`

**Test Case**: "Environment Adaptation"
1. Mock `requestAnimationFrame` to be `undefined` (simulating Node.js).
2. Instantiate `Helios`.
3. Call `helios.play()`.
4. Wait for 50ms.
5. Verify `currentFrame` > 0.
6. Verify no crash occurs.

**Success Criteria**: Tests pass with `requestAnimationFrame` disabled.
