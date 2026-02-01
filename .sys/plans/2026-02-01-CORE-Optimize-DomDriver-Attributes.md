# Plan: Optimize DomDriver Attribute Caching

## 1. Context & Goal
- **Objective**: Optimize `DomDriver` by caching DOM attribute reads (`data-helios-*`) to eliminate redundant DOM access during the render loop.
- **Trigger**: "Maintenance, Optimization, and Stability" focus. Current implementation calls `getAttribute` multiple times per frame for every media element, which is a performance anti-pattern.
- **Impact**: Improves runtime performance of `DomDriver` (and thus `Helios` in browser environments), especially for compositions with many audio tracks. Reduces DOM thrashing.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts`
- **Read-Only**: `packages/core/src/Helios.ts`

## 3. Implementation Spec
- **Architecture**:
  - Extend `TrackState` interface in `DomDriver.ts` to include cached attribute values (`offset`, `seek`, `fadeIn`, `fadeOut`, `trackId`).
  - Use `MutationObserver` to reactively update this cache only when attributes change.
- **Pseudo-Code**:
  - Update `TrackState` interface.
  - Create a helper `updateElementCache(el: HTMLMediaElement)` that reads attributes and updates `trackStates`.
  - In `scanAndAdd`, call `updateElementCache` for discovered media elements.
  - In `MutationObserver` config, add `data-helios-offset`, `data-helios-seek`, `data-helios-fade-in`, `data-helios-fade-out` to `attributeFilter`.
  - In `MutationObserver` callback:
    - For changed attributes, call `updateElementCache(target)`.
    - If `data-helios-track-id` changed (or any attribute that affects discovery), call `rebuildDiscoveredTracks`.
  - In `syncMediaElements`, read values from `trackStates.get(el)` instead of `el.getAttribute`. If cache is missing (fallback), call `updateElementCache`.
- **Public API Changes**: None (internal optimization).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run existing tests: `npm test -w packages/core`.
- **Success Criteria**:
  - All tests pass (regression testing).
  - Manual verification: Inspect `DomDriver.ts` to ensure `getAttribute` is not called in the `update` loop.
- **Edge Cases**:
  - Dynamic attribute updates (via JS) must still be reflected in playback (verified by `MutationObserver` logic).
  - New elements added/removed must have cache initialized/cleared.
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
