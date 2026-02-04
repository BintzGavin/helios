## 0.66.0 - VideoTracks API Implementation
**Learning:** Implementing `EventTarget` based lists like `VideoTrackList` requires manual index management (e.g., `(this as any)[index] = track`) to support array-like access (`list[0]`) while maintaining event dispatching capabilities.
**Action:** When implementing similar list-based APIs in the future, follow this pattern or consider using a `Proxy` if the environment supports it fully and performance allows.

## 0.65.2 - Responsive Image Capture
**Learning:** `dom-capture` utilities operating on detached clones lose the `currentSrc` context of responsive images (`srcset`/`sizes`). Parallel traversal of the original and clone trees is required to transfer the resolved `currentSrc`.
**Action:** When capturing DOM state for export or transfer, always prefer parallel traversal (Original + Clone) over post-clone traversal to preserve computed or environment-dependent state like `currentSrc`, scroll positions, or canvas content.
