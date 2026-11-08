1. **Analyze journal and plans**: I will review `.jules/RENDERER.md` (or `docs/status/RENDERER-EXPERIMENTS.md`) and `.sys/plans/PERF-*.md` to find completed and failed plans.
2. **Review codebase**: I will check `packages/renderer/src/Renderer.ts`, `packages/renderer/src/core/CaptureLoop.ts` and other hot paths to identify bottlenecks.
3. **Formulate a new experiment**: I will design a new experiment (`PERF-1190`) targeting a high-leverage optimization not yet tried (or a variation of what worked).
4. **Create the plan file**: I will create `.sys/plans/PERF-1190-slug.md` with the required structure (`id`, `slug`, `status: unclaimed`, etc.).
5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**: I will run `pre_commit_instructions`.
6. **Submit PR**: I will use the `submit` tool to commit the new plan and create a PR.
