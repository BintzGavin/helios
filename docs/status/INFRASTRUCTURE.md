# Infrastructure Status

**Version**: 0.0.0

## Current State

The Helios Infrastructure domain (`packages/infrastructure`) does not yet exist. It is a V2 initiative focused on distributed rendering suitable for cloud execution.

Per AGENTS.md, Infrastructure is "ACTIVELY EXPANDING FOR V2 WHEN PRESENT."

## V2 Scope

Infrastructure will own:

1. **Stateless Worker Architecture** - Workers that don't rely on prior frame state
2. **Deterministic Frame Seeking** - Any frame can be rendered independently
3. **Output Stitching** - Combine segments without re-encoding (concat demuxer)
4. **Cloud Execution Adapters** - AWS Lambda, Google Cloud Run
5. **Job Orchestration** - Work distribution and lifecycle management

## Backlog Items

From `docs/BACKLOG.md`:
- [ ] Implement stateless worker architecture
- [ ] Ensure deterministic frame seeking across all drivers
- [ ] Implement output stitching without re-encoding
- [ ] Cloud execution adapter (AWS Lambda / Google Cloud Run)

## Dependencies

- RENDERER: Must support stateless frame seeking for distributed execution
- CORE: Must provide deterministic animation state for any given time

## History

[v0.0.0] Initial status file created. Package does not yet exist.
