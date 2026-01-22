# Renderer Journal

## 2024-05-24 - Initial Journal Creation
**Learning:** Initialized journal for tracking critical learnings.
**Action:** Always check this file before planning.

## 2024-05-24 - Gitignore vs Memory Mismatch
**Learning:** Memory stated `output/` was in `.gitignore`, but it was not. This could have led to committing artifacts.
**Action:** Always verify `.gitignore` content before assuming artifacts are ignored, regardless of memory.

## 2024-05-24 - System Directory Permissions
**Learning:** Attempting to write to `/.sys/plans` failed with permission denied. The root `/` is likely restricted.
**Action:** Use relative paths like `.sys/plans` when creating system files.
