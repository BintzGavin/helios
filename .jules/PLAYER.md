## 0.66.0 - VideoTracks API Implementation
**Learning:** Implementing `EventTarget` based lists like `VideoTrackList` requires manual index management (e.g., `(this as any)[index] = track`) to support array-like access (`list[0]`) while maintaining event dispatching capabilities.
**Action:** When implementing similar list-based APIs in the future, follow this pattern or consider using a `Proxy` if the environment supports it fully and performance allows.
