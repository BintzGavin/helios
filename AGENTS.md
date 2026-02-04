# HELIOS AGENTS AND GOVERNANCE

## SYSTEM OVERVIEW

Helios is an autonomous software system developed using a vision-driven architecture.

**Autonomous agents do not invent work.** They resolve deltas between documentation and code.
- **Documentation defines gravity.**
- **Code moves to reduce the delta.**

When no delta exists, agents must idle. **Idling is success.**

### CURRENT STATE SUMMARY

Helios V1 goals are largely complete. Core rendering, player infrastructure, and local workflows are stable and feature-complete relative to V1 documentation. Recent stalls indicate gravitational equilibrium, not failure.

The purpose of this document is to define Helios V2 and reintroduce intentional gravitational pull.

---

## ROADMAP PHASES

### V1 COMPLETION
V1 focused on:
- Local rendering workflows
- Browser-native animation and capture
- Player and developer ergonomics
- Core engine stability

These goals are considered complete unless explicitly reopened under V2.

### V2 PLATFORM DIRECTION
Helios is transitioning from a local developer library into a distributed video platform with a component economy. V2 is defined by the following explicit deltas.

#### DISTRIBUTED RENDERING
Helios must support distributed rendering suitable for cloud execution.
*Key constraints:*
- Stateless workers
- Deterministic frame seeking
- No reliance on replaying prior frames
- Output stitching without re-encoding where possible
*Local-only rendering is insufficient for V2 goals.*

#### COMPONENT REGISTRY
Helios will support a Shadcn-style component registry.
*Constraints:*
- Components are copied into user repositories
- Users own and modify component code
- Registry distributes source, not opaque binaries
*The registry is part of the product surface, not core rendering logic.*

#### PRODUCT SURFACE PRIORITY
**Studio, CLI, and Examples are first-class product surfaces in V2.**
Core and renderer stability are prerequisites, not areas for speculative refactoring.

#### MONETIZATION READINESS
Helios V2 must be structurally compatible with future monetization.
- No monetization logic should be implemented prematurely.
- Architecture must not preclude paid registries, hosted rendering, or platform services.

---

## DOMAIN POSTURE

### CORE
**Posture: STABLE AND FEATURE COMPLETE**
- **Allowed work:** API clarity, Stability, Enabling distributed rendering/component consumption.
- **Forbidden work:** Cosmetic refactors, Dependency churn, Rewriting stable logic without a V2 requirement.

### RENDERER
**Posture: MAINTENANCE WITH V2 EXPANSION**
- **Allowed work:** Deterministic rendering, Stateless frame seeking, Distributed execution enablement.
- **Forbidden work:** Non-blocking refactors, Performance work not tied to V2 goals.

### PLAYER
**Posture: ACTIVELY EXPANDING**
- High activity domain focused on parity with standard HTMLMediaElement and advanced export capabilities.
- **Allowed work:** Feature parity, Client-side export robustness, Bridge security.

### STUDIO
**Posture: ACTIVELY EXPANDING FOR V2**
- Primary product surface.

### CLI
**Posture: ACTIVELY EXPANDING FOR V2**
- Primary interface for registry, workflows, and deployment.

### SKILLS
**Posture: ACTIVELY EXPANDING**
- Critical for agent autonomy and expanding the knowledge base.
- **Allowed work:** Creating new skills for uncovered domains, updating existing skills with new patterns.

### LLMS
**Posture: MAINTENANCE**
- **Allowed work:** Daily updates to `llms.txt` to ensure context accuracy.

### DOCS
**Posture: ACTIVELY EXPANDING**
- Documentation determines the gravity for all other domains.

### EXAMPLES
**Posture: ACTIVELY EXPANDING FOR V2**
- Examples are a core teaching and validation surface.

### INFRASTRUCTURE
**Posture: INCUBATING**
- Includes cloud rendering and governance tooling.

---

## GOVERNANCE LAWS

### DEPENDENCY GOVERNANCE
Agents are prohibited from manually synchronizing internal package versions.
- External dependency updates are handled by deterministic tooling.
- Internal version propagation is handled by release tooling.
- Version mismatches are governance issues, not coding tasks.
*Dependency churn must not appear as agent work.*

### NOTHING TO DO PROTOCOL
When a domain is aligned with this document, agents must not:
- Invent refactors
- Chase dependency noise
- Create work for activity alone

**Allowed fallback actions:**
1. Regression tests
2. Examples
3. Documentation clarity / Knowledge Management (Wiki/Skills)
4. Benchmarks (only if performance is a selling point)

*Agents are allowed to conclude that no work is required.*

### BACKLOG RELATIONSHIP
`docs/BACKLOG.md` exists to track concrete deliverables derived from this document. It merely references individual BACKLOG pages for each agent which is where the actual updates are made.

### README RELATIONSHIP
`README.md` is informational only.
- **Must:** Describe what Helios is today, explain installation/usage, market to humans.
- **Must Not:** Contain roadmaps, future planning, or work to be done.
*README may only reference AGENTS.md as the source of project direction.*
