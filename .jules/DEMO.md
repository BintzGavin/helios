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
