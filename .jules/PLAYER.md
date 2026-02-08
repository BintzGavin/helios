## [v0.76.1] - Decouple Core
**Learning:** To decouple a runtime dependency on a class library (like `@helios-project/core`) while still accessing static methods on instances provided by the environment, use `import type` and access the constructor dynamically: `(instance.constructor as any).staticMethod()`. This prevents the bundler from including the library code.
**Action:** Use this pattern when the package is intended to be lightweight and the dependency is guaranteed to be present in the runtime environment (e.g. injected via iframe).

## [v0.76.1] - WYSIWYG Captions
**Learning:** Hardcoded styling in export logic (e.g. `height * 0.05`) creates a mismatch with fixed UI styling (e.g. `16px`), breaking the WYSIWYG promise. Responsive styling must be implemented in the UI and synchronized with the exporter via passed configuration.
**Action:** When implementing visual features in the player, always expose style configuration and ensure the `ClientSideExporter` receives and respects these same styles relative to the output resolution.

## [v0.76.1] - Async Seek Gap
**Learning:** The `currentTime` setter in `HeliosPlayer` assumed synchronous seeking, which caused `seeked` to fire prematurely in Bridge mode. Standard Media API compliance requires `seeking` to remain true until the frame is actually updated.
**Action:** When implementing bridge-based media controls, always ensure a request/response pattern for state-changing operations like `seek` to maintain state consistency.

## [v0.76.1] - Canvas Resolution Mismatch
**Learning:** `captureFrame` (and `VideoFrame` from Canvas) captures the backing store resolution, which might differ from the requested export resolution. The `ClientSideExporter` assumed the source frame matched the target size.
**Action:** Always verify target dimensions in export logic and explicitly resize (via intermediate canvas) if the source frame doesn't match the target.

## [v0.76.1] - Reactive DOM Features
**Learning:** Features that interact with composition DOM elements (like `AudioFader`) must use `MutationObserver` to handle dynamic content (e.g. React rendering), as a single scan on `connect` misses elements added later.
**Action:** Always implement `MutationObserver` when building features that need to track DOM elements inside the composition iframe.

## [v0.76.1] - Preview/Export Parity Gap
**Learning:** `AudioFader` (preview) supported `<video>` elements but `ClientSideExporter` (export) did not, because they used different asset discovery logic.
**Action:** Always ensure asset discovery logic is shared or identical between runtime preview features and export logic to prevent feature gaps.

## [v0.76.2] - Workspace Dependency Mismatch
**Learning:** `npm install` failed because `packages/studio` depended on `@helios-project/player@^0.74.0` while the workspace had `0.76.1`, and npm tried to fetch from registry. Explicitly updating the consumer's dependency version to match the workspace fixed it.
**Action:** When working in a monorepo, ensure internal dependencies in `package.json` match the current workspace versions to prevent registry fallback errors.
