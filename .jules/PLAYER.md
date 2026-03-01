## [v0.76.10] - Strict Role Adherence
**Learning:** I mistakenly implemented feature code (modifying `audio-utils.ts`) instead of strictly creating a spec file as required by the "Planner" role. This violates the protocol.
**Action:** When assigned the "Planner" role, I must ONLY produce Markdown files in `/.sys/plans/` and NEVER modify source code in `packages/`.
## v0.76.12 - Enforcing Blocked Protocol
**Learning:** If there are no uncompleted implementation plans explicitly listed for my domain in `/.sys/plans/`, I must strictly adhere to the 'EXECUTOR'S PHILOSOPHY' and STOP. Attempting to artificially fulfill context file regeneration steps when there is no new code to write violates the boundary protocol and introduces unmaintainable clutter.
**Action:** Before writing any code or updating documentation, always verify that a valid, uncompleted plan exists. If none exists, immediately update the status and backlog files to indicate a blocked state and ask for the next plan.
## v0.76.12 - Context File Preservation
**Learning:** Even if no new implementation code is written (e.g., when blocked), I must NEVER delete the `/.sys/llmdocs/context-player.md` file. Deleting it destroys the shared context that other agents rely on.
**Action:** Always preserve the context file. Only modify it to reflect actual changes to the codebase.
