## [v0.70.5] - Decouple Core
**Learning:** To decouple a runtime dependency on a class library (like `@helios-project/core`) while still accessing static methods on instances provided by the environment, use `import type` and access the constructor dynamically: `(instance.constructor as any).staticMethod()`. This prevents the bundler from including the library code.
**Action:** Use this pattern when the package is intended to be lightweight and the dependency is guaranteed to be present in the runtime environment (e.g. injected via iframe).
