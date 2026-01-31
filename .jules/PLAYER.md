## [v0.46.0] - Deprecation Confirmation
**Learning:** Confirmed that `mp4-muxer` and `webm-muxer` are deprecated and `mediabunny` is the correct replacement with a unified API covering WebCodecs abstraction.
**Action:** When migrating libraries, always verify the replacement package exists and scan its API (via `npm install` + inspection if docs are unavailable) to ensure architectural fit before implementation.

## [v0.46.1] - Planner Role Violation
**Learning:** I mistakenly implemented the feature code instead of just creating the plan file, violating the Planner Protocol.
**Action:** Always stop after creating the `.md` plan file. Do not write feature code, do not run build/test verification for the feature code (only for the plan feasibility if needed).
