# [CORE] Optimize DomDriver Performance

## 1. Context & Goal
- **Objective**: Optimize `DomDriver` to cache media elements using `MutationObserver` instead of querying the DOM every frame, and implement proper resource disposal.
- **Trigger**: `querySelectorAll` is called on every frame (60fps), causing performance overhead. `DomDriver` lacks cleanup mechanism (observer disconnect).
- **Impact**: Significantly reduces CPU usage during playback/scrubbing, especially in complex DOM structures. Enables robust cleanup of observers.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `dispose?(): void` to interface)
- **Modify**: `packages/core/src/index.ts` (Call `this.driver.dispose?.()` in `dispose()`)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement `MutationObserver` and `dispose`)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Add tests for observer and disposal)
- **Read-Only**: `packages/core/src/drivers/WaapiDriver.ts`, `packages/core/src/drivers/NoopDriver.ts`

## 3. Implementation Spec
- **Architecture**:
    - `DomDriver` maintains a `Set<HTMLMediaElement>` cache.
    - `init()` starts a `MutationObserver` to track added/removed nodes.
    - `update()` iterates the cache.
    - `dispose()` disconnects observer and clears cache.
    - `TimeDriver` interface updated to include optional `dispose` method.

- **Pseudo-Code**:
    ```typescript
    // TimeDriver.ts
    export interface TimeDriver {
        // ... existing
        dispose?(): void;
    }

    // DomDriver.ts
    class DomDriver implements TimeDriver {
        private observer: MutationObserver | null = null;
        private mediaElements = new Set<HTMLMediaElement>();
        // ...
        init(scope) {
            // Initial scan
            const initialElements = scope.querySelectorAll('audio, video');
            initialElements.forEach(el => this.mediaElements.add(el as HTMLMediaElement));

            // Setup Observer
            if (typeof MutationObserver !== 'undefined') {
                this.observer = new MutationObserver(mutations => {
                    mutations.forEach(m => {
                        m.addedNodes.forEach(node => {
                            if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
                                this.mediaElements.add(node as HTMLMediaElement);
                            }
                            if (node instanceof Element) {
                                node.querySelectorAll('audio, video').forEach(el =>
                                    this.mediaElements.add(el as HTMLMediaElement)
                                );
                            }
                        });
                        m.removedNodes.forEach(node => {
                            if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
                                this.mediaElements.delete(node as HTMLMediaElement);
                            }
                            if (node instanceof Element) {
                                node.querySelectorAll('audio, video').forEach(el =>
                                    this.mediaElements.delete(el as HTMLMediaElement)
                                );
                            }
                        });
                    });
                });
                this.observer.observe(scope, { childList: true, subtree: true });
            }
        }

        update(time, options) {
            // iterate over this.mediaElements instead of querySelectorAll
            this.mediaElements.forEach(el => {
                // ... existing sync logic ...
            });
        }

        dispose() {
            this.observer?.disconnect();
            this.mediaElements.clear();
        }
    }

    // index.ts (Helios class)
    dispose() {
        // ... existing cleanup
        this.driver.dispose?.();
    }
    ```

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test packages/core/src/drivers/DomDriver.test.ts`
- **Success Criteria**:
    - Tests verify `mediaElements` Set is updated when nodes are added/removed.
    - `dispose` method disconnects the observer.
    - Existing functionality (syncing) remains intact.
- **Edge Cases**:
    - Removing a parent element containing media (ensure nested removal is tracked).
    - Adding a parent element containing media.
