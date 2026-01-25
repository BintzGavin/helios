## 2026-02-19 - Planner vs Executor Boundary
**Learning:** I mistakenly executed code changes (modifying source, creating scripts) instead of just creating a plan file. The Planner role is strictly for architecture and spec generation.
**Action:** Never modify `packages/` source code. Only create `.md` files in `.sys/plans/` and update `docs/` or `.jules/` if needed.

## 2026-02-19 - Spec File Constraints
**Learning:** Plan files must use strict pseudo-code and architecture descriptions, avoiding actual syntax-highlighted code snippets.
**Action:** Use "CALCULATE", "SET", "CALL" style pseudo-code in Implementation Spec sections.
