## [v0.70.5] - Decouple Core
**Learning:** To decouple a runtime dependency on a class library (like `@helios-project/core`) while still accessing static methods on instances provided by the environment, use `import type` and access the constructor dynamically: `(instance.constructor as any).staticMethod()`. This prevents the bundler from including the library code.
**Action:** Use this pattern when the package is intended to be lightweight and the dependency is guaranteed to be present in the runtime environment (e.g. injected via iframe).

## [v0.70.5] - WYSIWYG Captions
**Learning:** Hardcoded styling in export logic (e.g. `height * 0.05`) creates a mismatch with fixed UI styling (e.g. `16px`), breaking the WYSIWYG promise. Responsive styling must be implemented in the UI and synchronized with the exporter via passed configuration.
**Action:** When implementing visual features in the player, always expose style configuration and ensure the `ClientSideExporter` receives and respects these same styles relative to the output resolution.
