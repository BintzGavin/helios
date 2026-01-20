## 1. Context & Goal
- **Objective**: Address code review feedback regarding WAAPI driver performance and specificity.
- **Feedback**:
  1. `syncDomAnimations` pauses ALL animations indiscriminately.
  2. `document.getAnimations()` every frame is slow.

## 2. File Inventory
- **Modify**: `packages/core/src/index.ts`
- **Modify**: `packages/core/src/index.test.ts`

## 3. Implementation Spec
- **Architecture**:
  - Add `animationScope?: HTMLElement` to `HeliosOptions`.
  - If `animationScope` is provided, use `scope.getAnimations({ subtree: true })`.
  - If not provided, fallback to `document.getAnimations()` (backward compatible for now, or maybe strict?). Let's default to `document` if no scope.
  - *Optimization*: We will cache the animations list. We will add a method `refreshAnimations()` that the user can call if they add/remove animations dynamically. We will also refresh on `play()`.
  - *Revised Logic*:
    - `private animationsCache: Animation[] = [];`
    - `play()` -> `this.refreshAnimations()` -> `super.play()`.
    - `seek()` -> `this.refreshAnimations()` (optional, maybe just use cache? No, seeking usually implies random access, maybe new state).
    - *Better approach for "Auto"*:
      - If `autoSyncAnimations` is true, we should probably just query every frame *unless* we cache.
      - Let's implementing caching with a manual invalidation strategy for performance, but `tick` uses the cache.
      - `tick` loop is high frequency. It should iterate `this.animationsCache`.
      - We update `this.animationsCache` on `play()` and maybe on a throttled basis?
      - Let's keep it simple: **Just limit the scope for now.** Caching stateful animations is tricky because they are garbage collected or finished.
      - **Plan**:
        1. Add `excludeSelectors?: string[]` to `HeliosOptions` to ignore specific animations? No, too complex.
        2. Add `scope?: HTMLElement` to `HeliosOptions`.
        3. Use `element.getAnimations({ subtree: true })`.

- **Pseudo-Code**:
  ```typescript
  interface HeliosOptions {
      // ...
      animationScope?: HTMLElement;
  }

  // in syncDomAnimations
  const source = this.options.animationScope || document;
  const anims = source.getAnimations({ subtree: true });
  // ...
  ```

- **Addressing Performance**:
  - The reviewer said "Consider optimizing by caching".
  - Let's try to cache the result of `getAnimations` when `isPlaying` starts, and clear it on `pause`.
  - But what if new animations start during playback? (e.g. via JS). They wouldn't be synced.
  - However, for a *rendering engine*, the scene is usually deterministic.
  - Let's stick to the "Scope" fix first, as it's safer.

## 4. Test Plan
- **Verification**: `npx vitest run packages/core`
- **Success Criteria**:
  - Test that providing a scope only syncs animations inside that scope.
