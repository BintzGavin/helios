# Planner's Journal: DEMO

## [1.0.0] - Initialization
**Learning:** Initialized the journal.
**Action:** Always check this file before planning.

## [1.63.0] - Roadmap Discrepancies
**Learning:** The `README.md` Roadmap is outdated; features like SRT Captions (`captions: srt`) and advanced animation helpers (`interpolate`, `spring`) are implemented and functioning in examples (`captions-animation`, `animation-helpers`), despite being marked as "Not yet" or "Planned".
**Action:** When identifying gaps, prioritize verifying feature existence in code (`examples/`) over trusting the `README.md` status.

## [1.63.1] - SolidJS Architecture
**Learning:** SolidJS components run once, making the standard React `Children.map` pattern for `<Series>` impossible. Parity requires a Context-based "Registration" pattern where children register themselves with the parent to receive offsets.
**Action:** When porting React-based helpers to SolidJS, check if the pattern relies on VDOM inspection; if so, refactor to Signal/Context communication.

## [1.64.2] - Client-Side Verification Gap
**Learning:** The "Client-Side Export" feature (WebCodecs) is a "Current Capability" and "Primary Export Path" in the Vision, yet it had zero automated E2E coverage. E2E tests focused entirely on the server-side `Renderer` class.
**Action:** Ensure E2E tests cover not just the `Renderer` pipeline but also the `<helios-player>` features (export, controls, interactivity) by running tests against built client artifacts.
