## v0.78.4 - Missing Methods vs Internal Features
**Learning:** Found that while a feature might be fully implemented internally (like `setPlaybackRange` in `HeliosController`), it can sometimes be omitted from the public `HeliosPlayer` API wrapper. We must explicitly check `packages/player/src/index.ts` to confirm public availability, rather than just trusting `HeliosController` or the UI shortcuts.
**Action:** Always verify if internal controller capabilities are mapped to public Web Component methods.
## v0.78.4 - Missing Methods vs Internal Features
**Learning:** Found that while a feature might be fully implemented internally (like `setPlaybackRange` in `HeliosController`), it can sometimes be omitted from the public `HeliosPlayer` API wrapper. We must explicitly check `packages/player/src/index.ts` to confirm public availability, rather than just trusting `HeliosController` or the UI shortcuts.
**Action:** Always verify if internal controller capabilities are mapped to public Web Component methods.
## v0.79.2 - Missing Methods vs Internal Features
**Learning:** Found that while a feature might be fully implemented internally (like `setPlaybackRange` in `HeliosController`), it can sometimes be omitted from the public `HeliosPlayer` API wrapper. We must explicitly check `packages/player/src/index.ts` to confirm public availability, rather than just trusting `HeliosController` or the UI shortcuts.
**Action:** Always verify if internal controller capabilities are mapped to public Web Component methods.
## v0.79.3 - preservesPitch gap
**Learning:** Found that `preservesPitch` is exposed in `HeliosPlayer` and documented in `README.md`, but it requires core architectural changes in `packages/core/src/drivers/DomDriver.ts` to actually function. As a PLAYER domain planner, I cannot modify `packages/core`.
**Action:** When an API property requires core logic that isn't implemented, it must be removed from the README to avoid misleading users until a core task can be scheduled.

## [0.79.10] - Implement getStartDate
**Learning:** Implementing missing API parity methods improves standard compliance.
**Action:** Always check the HTMLMediaElement specification for missing methods.
