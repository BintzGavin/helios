# Helios Backlog

This backlog tracks concrete deliverables derived from [`AGENTS.md`](../AGENTS.md).

## Distributed Rendering
*Helios must support distributed rendering suitable for cloud execution.*

- [ ] Implement stateless worker architecture.
- [ ] Ensure deterministic frame seeking across all drivers.
- [x] Implement output stitching without re-encoding (verify `concat` demuxer workflow).
- [ ] Cloud execution adapter (AWS Lambda / Google Cloud Run).

## Prompt to Composition
*Helios must support workflows where a structured prompt produces a valid composition.*

- [ ] Define structured prompt schema.
- [ ] Implement composition generation logic.
- [ ] Validate generated compositions without manual assembly.

## Component Registry
*Helios will support a Shadcn-style component registry.*

- [x] Design registry manifest format.
- [x] Implement CLI command to fetch and copy components.
- [x] Create initial set of core components.

## Product Surface (Studio, CLI, Examples)
*Studio, CLI, and examples are first class product surfaces in V2.*

- [x] **Studio**: Expand features to support distributed rendering configuration.
- [x] **CLI**: Implement init command.
- [x] **CLI**: Implement registry commands.
- [ ] **Examples**: Create examples demonstrating distributed rendering workflows.
- [ ] **Examples**: Create examples demonstrating component usage.

## Maintenance & Stability
*Core and renderer stability are prerequisites.*

- [x] **Fix GSAP Timeline Synchronization in SeekTimeDriver**
  - **Problem**: Promo video (`examples/promo-video/composition.html`) renders a black video with only the background visible. GSAP timeline animations aren't being seeked during rendering.
  - **Root Cause**: `window.__helios_gsap_timeline__` is not available when `setTime()` first runs, and subscription timing may be off.
  - **Goal**: Ensure GSAP timelines are correctly synchronized during frame capture.
  - **Verification**: `examples/promo-video` must render correctly with all scenes visible.

- [ ] **Documentation**: Add Quickstart guide.
