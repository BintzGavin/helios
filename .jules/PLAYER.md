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
