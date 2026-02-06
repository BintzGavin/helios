## 0.66.3 - Sandbox Attribute Getter
**Learning:** The `sandbox` getter in `HeliosPlayer` incorrectly returns the default value when the attribute is set to an empty string (`""`), preventing users from enabling strict sandbox mode via the property. The attribute behavior itself is correct.
**Action:** In future refactors, update the `sandbox` getter to check for `null` explicitly rather than using the `||` operator on the attribute value.

## 0.66.3 - Audio Track UI
**Learning:** While the `AudioTracks` API was implemented, the lack of UI controls made it inaccessible for previewing multi-track compositions without custom code.
**Action:** When implementing new APIs that affect user-perceivable state (like tracks), always include a corresponding UI control update in the plan.

## 0.66.3 - Keyboard Shortcuts Standard
**Learning:** The existing keyboard shortcuts implementation (Arrows = 1 frame) deviated from standard video player conventions (usually 5s), leading to a frustrating UX for playback navigation.
**Action:** Always verify "Standard" features against industry leaders (YouTube, VLC) rather than just implementing technical parity (frame steps).

## 0.66.4 - Playback Speed Granularity
**Learning:** The previous implementation of playback speed options (0.25, 0.5, 1, 2) was too coarse for effective review. Standard players offer intermediate steps (0.75, 1.25, etc.).
**Action:** When implementing range-based controls, check industry standards (YouTube, VLC) for common step values.

## 0.68.0 - Destructive Audio Metering
**Learning:** The `AudioMeter` implementation uses `createMediaElementSource` which "hijacks" the audio output. Destroying the meter's `AudioContext` permanently silences the media element, making it impossible to toggle metering without reloading.
**Action:** Always maintain a persistent audio graph for pass-through audio when using Web Audio API with media elements. Use `disconnect()` on the analyzer path instead of closing the context.

## v0.70.0 - Planner Protocol Violation
**Learning:** The "Planner" role must strictly produce a `.sys/plans/` file and NOT execute `set_plan` or write implementation code, even if standard system prompts suggest otherwise.
**Action:** When acting as Planner, verify the output is ONLY a markdown file in `.sys/plans/` and use `write_file` instead of `set_plan`.

## v0.71.0 - UMD Build Decoupling
**Learning:** `vite` configuration externalizing `@helios-project/core` causes the UMD build to require a global `HeliosCore` variable, breaking standalone CDN usage. Using `import type` and `instance.constructor` avoids hard runtime dependencies.
**Action:** When designing "drop-in" components that depend on a core library, avoid value imports from the core to ensure the UMD build remains self-contained.
