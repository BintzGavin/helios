## 2026-03-01 - Plan Step Specificity
**Learning:** The `set_plan` steps must not imply that I will write code (e.g., "Implement X"). They must be explicitly about "Creating the Spec File". The reviewer is strict about this distinction to prevent role violation.
**Action:** Always phrase plan steps as "Create spec file for X" rather than "Implement X".

## 2026-03-01 - Vision Gaps in Empty Backlog
**Learning:** Even when the status backlog is empty, critical gaps can exist (e.g., missing `poster` or `preload`). A clean backlog doesn't mean the product is complete; it just means known tasks are done.
**Action:** When the backlog is empty, revisit the "Vision" (README) and "User Experience" (Standard HTML5 APIs) to find missing features that improve quality or parity.

## 2026-03-01 - Test Plan Specificity
**Learning:** If the Test Plan mentions adding or modifying specific test files (e.g., `controllers.test.ts`), those files MUST be listed in the "Modify" section of the File Inventory, and they MUST be read during the Exploration phase.
**Action:** Always cross-reference the Test Plan with the File Inventory and Exploration steps.

## 2026-03-01 - Interactive Mode Default
**Learning:** Defaulting to standard video behavior (click-to-pause) is safer for a "Player" component to align with user expectations, even if it changes existing behavior (clicks passing through), provided an opt-out (`interactive` attribute) is available.
**Action:** When refining UI components, prioritize standard UX patterns over incidental behaviors (like click-through), but provide configuration for the alternative.

## 2026-03-01 - Memory Hallucination
**Learning:** The memory stated that `interactive` attribute was implemented, but the code lacked it. Memories can hallucinate features.
**Action:** Always verify "known" features against the actual codebase (`read_file`) before assuming they exist.
