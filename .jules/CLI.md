# CLI Agent Journal

Critical learnings only. This is not a log—only add entries for insights that will help avoid mistakes or make better decisions.

## [0.1.0] - Initial State
**Learning:** The CLI package was created with minimal structure. It uses Commander.js and has a single `studio` command that spawns the Studio dev server. The pattern for adding new commands is to create a file in `src/commands/` with a `registerXCommand(program)` function.
**Action:** Follow the established pattern when adding new commands. Import and register in `src/index.ts`.
