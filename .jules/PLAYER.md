## [v0.46.0] - Deprecation Confirmation
**Learning:** Confirmed that `mp4-muxer` and `webm-muxer` are deprecated and `mediabunny` is the correct replacement with a unified API covering WebCodecs abstraction.
**Action:** When migrating libraries, always verify the replacement package exists and scan its API (via `npm install` + inspection if docs are unavailable) to ensure architectural fit before implementation.

## [v0.46.1] - Planner Role Violation
**Learning:** I mistakenly implemented the feature code instead of just creating the plan file, violating the Planner Protocol.
**Action:** Always stop after creating the `.md` plan file. Do not write feature code, do not run build/test verification for the feature code (only for the plan feasibility if needed).

## [v0.49.3] - Audio Track Control Gap
**Learning:** Discovered that `HeliosController` interface blocked Studio from controlling individual audio tracks, despite Core support.
**Action:** When defining cross-domain interfaces (Player <-> Studio), verify all necessary Core capabilities are exposed, not just the ones needed for the immediate UI.

## [v0.51.0] - Audio Track ID Gap
**Learning:** Discovered that `HeliosController.setAudioTrackVolume` requires an ID, but `getAudioAssets` (used for track discovery) does not return one, making the API unusable for generic players.
**Action:** When designing controller APIs for resources (tracks, assets), always ensure the "List" method returns the unique identifiers required by the "Control" methods.

## [v0.52.0] - Standard Attributes UX
**Learning:** Standard HTML5 video attributes like `disablePictureInPicture` and `default` (for tracks) are critical for expected UX but were missed in initial implementation.
**Action:** When implementing standard elements (like `<video>`), systematically review the entire MDN attribute list to ensure behavioral parity, especially for UI controls visibility.

## [v0.56.1] - Missing Framework Adapters
**Learning:** README promises "Framework Adapters" packages (e.g. `@helios-project/react`), but they do not exist in the monorepo, only as examples.
**Action:** Identify if these should be first-class packages or just examples. If packages, create a plan to scaffold them properly in `packages/`.

## [v0.56.1] - Diagnostics UX Gap
**Learning:** Diagnostics API exists (`Helios.diagnose()`), but the Player UI has no way to expose this info to users/agents without custom scripts, despite the vision emphasizing "Diagnostics for AI Environments".
**Action:** Plan features that not only implement the API but also expose it in the UI (e.g. Debug Overlay) or use it for proactive error prevention (e.g. checking export codecs).

## [v0.57.0] - Dependency Deadlock
**Learning:** Encountered a situation where root-level `npm install` failed due to version mismatches in *other* workspaces, blocking `npm run build` for the current workspace despite correct local dependencies.
**Action:** When verification is blocked by external environment issues, proceed with implementation and manual code verification, but clearly document the limitation. Ensure unit tests are added to aid future validation once the environment is stabilized.

## [v0.58.0] - Export Bitrate Configuration
**Learning:** `mediabunny` exposes `bitrate` in its `VideoEncodingConfig`, which maps directly to WebCodecs `VideoEncoder` configuration, allowing for precise quality control.
**Action:** When adding export configuration, pass parameters directly through to the `VideoEncodingConfig` object in `ClientSideExporter`.

## [v0.59.1] - Standard Media API Parity Gap
**Learning:** README promises "Standard Media API" support, but `HeliosTextTrack` implementation is incomplete (missing `activeCues` and events), creating a false promise for developers expecting standard behavior.
**Action:** When implementing "Standard" APIs, always check the MDN specification for key properties and events, and document any intentional deviations or "subset" limitations clearly.
