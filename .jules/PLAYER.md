## v0.78.4 - Missing Methods vs Internal Features
**Learning:** Found that while a feature might be fully implemented internally (like `setPlaybackRange` in `HeliosController`), it can sometimes be omitted from the public `HeliosPlayer` API wrapper. We must explicitly check `packages/player/src/index.ts` to confirm public availability, rather than just trusting `HeliosController` or the UI shortcuts.
**Action:** Always verify if internal controller capabilities are mapped to public Web Component methods.
## v0.78.4 - Missing Methods vs Internal Features
**Learning:** Found that while a feature might be fully implemented internally (like `setPlaybackRange` in `HeliosController`), it can sometimes be omitted from the public `HeliosPlayer` API wrapper. We must explicitly check `packages/player/src/index.ts` to confirm public availability, rather than just trusting `HeliosController` or the UI shortcuts.
**Action:** Always verify if internal controller capabilities are mapped to public Web Component methods.
