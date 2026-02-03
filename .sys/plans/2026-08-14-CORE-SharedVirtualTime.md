# CORE: Shared Virtual Time Binding

## 1. Context & Goal
- **Objective**: Implement a shared registry for Virtual Time bindings in `Helios` to allow multiple instances to synchronize in headless environments (CDP).
- **Trigger**: Vision Gap - "Timeline Synchronization". Currently, sequential `bindToDocumentTimeline` calls overwrite the global `window.__HELIOS_VIRTUAL_TIME__` setter, causing only the last instance to receive updates.
- **Impact**: Enables robust multi-composition rendering (e.g., video grids) via CDP without requiring manual synchronization logic in the renderer.

## 2. File Inventory
- **Modify**: `packages/core/src/Helios.ts`
  - Add static `_virtualTimeRegistry`, `_virtualTimeHooked`, `_originalVirtualTimeDescriptor`.
  - Add static helpers `_ensureVirtualTimeHook` and `_teardownVirtualTimeHook`.
  - Refactor `bindToDocumentTimeline`, `unbindFromDocumentTimeline`.
  - Add private `_onVirtualTimeChange`.
- **Modify**: `packages/core/src/virtual-time.test.ts`
  - Add test case: "should synchronize multiple instances with virtual time".

## 3. Implementation Spec

### Architecture
Use a **Static Registry Pattern** to decouple the global CDP hook from individual `Helios` instances.
- The `Helios` class maintains a static `Set<Helios>` of active listeners.
- The global `window.__HELIOS_VIRTUAL_TIME__` setter acts as a broadcaster, iterating over the registry.
- Individual instances subscribe/unsubscribe from the registry.

### Pseudo-Code

```typescript
class Helios {
  // Static State
  private static _virtualTimeRegistry = new Set<Helios>();
  private static _virtualTimeHooked = false;
  private static _originalVirtualTimeDescriptor: PropertyDescriptor | undefined;

  // Static Helpers
  private static _ensureVirtualTimeHook() {
    if (this._virtualTimeHooked) return;

    // Save original descriptor logic...

    try {
      Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', {
        configurable: true,
        enumerable: true,
        get: () => /* ... */,
        set: (value: number) => {
          // Broadcast to all
          this._virtualTimeRegistry.forEach(instance => {
             instance._onVirtualTimeChange(value);
          });
        }
      });
      this._virtualTimeHooked = true;
    } catch (e) {
      // Fallback logic
    }
  }

  private static _teardownVirtualTimeHook() {
    if (this._virtualTimeRegistry.size > 0) return;
    // Restore logic...
    this._virtualTimeHooked = false;
  }

  // Instance Methods
  public bindToDocumentTimeline() {
    if (this.syncWithDocumentTimeline) return;

    Helios._virtualTimeRegistry.add(this);
    Helios._ensureVirtualTimeHook();

    // If hook succeeded (check static flag or similar), set reactive flag
    if (Helios._virtualTimeHooked) {
        this._reactiveVirtualTimeBound = true;
    }

    this.syncWithDocumentTimeline = true;
    // ... polling fallback logic remains ...
  }

  public unbindFromDocumentTimeline() {
    Helios._virtualTimeRegistry.delete(this);
    Helios._teardownVirtualTimeHook();
    // ... cleanup ...
  }

  private _onVirtualTimeChange(value: number) {
     if (!this.syncWithDocumentTimeline) return;
     // ... update logic (frame calc, driver update) ...
  }
}
```

### Public API Changes
- No changes to public method signatures.
- `bindToDocumentTimeline` behavior changes to be additive rather than exclusive.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core -- src/virtual-time.test.ts`
- **Success Criteria**:
  - `isVirtualTimeBound` is true for multiple instances simultaneously.
  - Setting `window.__HELIOS_VIRTUAL_TIME__` updates `currentTime` on all bound instances.
  - Unbinding one instance leaves the other bound.
  - Unbinding all instances restores the original window property (or deletes it).
- **Edge Cases**:
  - `bindToDocumentTimeline` called multiple times on same instance (should be idempotent).
  - External code setting `__HELIOS_VIRTUAL_TIME__` before Helios loads (should be preserved).
