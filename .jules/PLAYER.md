
## v0.31.0 - Standard Media API Completeness
**Learning:** Marking "Standard Media API" as complete without `readyState`, `networkState` and loading events leaves the component incompatible with many video wrappers. Parity requires the full lifecycle, not just playback methods.
**Action:** When scoping "Standard API" tasks, explicitly list required states and events from the spec to ensure full coverage.
