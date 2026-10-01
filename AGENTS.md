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
- Cloud execution adapters: AWS Lambda, Google Cloud Run, Cloudflare Workers, Azure Functions, Fly.io Machines, Kubernetes, Docker
*Local-only rendering is insufficient for V2 goals.*

#### COMPONENT REGISTRY
Helios will support a Shadcn-style component registry.
*Constraints:*
- Components are copied into user repositories
- Users own and modify component code
- Registry distributes source, not opaque binaries
*The registry is part of the product surface, not core rendering logic.*

#### AI HOST DISTRIBUTION
AI assistants are a primary distribution channel for Helios. When someone asks ChatGPT, Claude, Codex or another agent for a video, the agent must reach for Helios, and the person must be able to watch, adjust and export the result without leaving the conversation.
Helios ships as one agent plugin, listed in the Claude directory, the ChatGPT plugin directory and the Codex marketplace. The plugin contains:
- Skills that teach the Helios video contract: one HTML page that draws any frame from its time `t`.
- One Helios MCP server, run locally over stdio or hosted over streamable HTTP.
- One MCP App view that plays a composition inside the conversation.
*Key constraints:*
- One package, many hosts. Build on the open standards (Agent Skills, MCP, MCP Apps, Agent Plugins). Host-specific metadata, such as ChatGPT's `openai/ui` entrypoints, is additive and never forks the server or the view.
- Local rendering stays the default and stays free. Use the user's machine whenever the host can run the server there.
- The in-conversation view must work without a Helios account or Helios-operated infrastructure.
- Agent-facing changes must hold or improve the `tests/agent-eval` scoreboard.
- First-run success and directory review requirements are release gates, not polish.
*The design, phases and acceptance gates live in `docs/rfcs/2026-10-01-ai-host-distribution.md`.*

#### PRODUCT SURFACE PRIORITY
**Studio, CLI, and Examples are first-class product surfaces in V2.**
Core and renderer stability are prerequisites, not areas for speculative refactoring.

#### MONETIZATION READINESS
Helios V2 must be structurally compatible with future monetization.
- No monetization logic should be implemented prematurely.
- Architecture must not preclude paid registries, hosted rendering, or platform services.
- Hosted rendering for AI hosts is the natural paid tier. The free plugin must never depend on it.

---

## DOMAIN POSTURE

### CORE
**Posture: STABLE AND FEATURE COMPLETE**
- **Allowed work:** API clarity, Stability, Enabling distributed rendering/component consumption.
- **Forbidden work:** Cosmetic refactors, Dependency churn, Rewriting stable logic without a V2 requirement.

### RENDERER
**Posture: MAINTENANCE WITH V2 EXPANSION**
- **Allowed work:** Deterministic rendering, Stateless frame seeking, Distributed execution enablement, Sharing the seek shim with in-conversation playback so the preview matches the render.
- **Forbidden work:** Non-blocking refactors, Performance work not tied to V2 goals.

### PLAYER
**Posture: ACTIVELY EXPANDING**
- High activity domain focused on parity with standard HTMLMediaElement and advanced export capabilities.
- **Allowed work:** Feature parity, Client-side export robustness, Bridge security, Playback inside MCP App views (sandboxed iframes with a strict CSP).

### STUDIO
**Posture: ACTIVELY EXPANDING FOR V2**
- Primary product surface.
- Studio's MCP server stays project-oriented; the plugin's MCP server is page-oriented. Both render through `@helios-project/renderer`, and neither re-implements rendering.

### CLI
**Posture: ACTIVELY EXPANDING FOR V2**
- Primary interface for registry, workflows, and deployment.
- Hosts the plugin's local MCP server (`helios mcp`) and the MCP App view it serves.

### SKILLS
**Posture: ACTIVELY EXPANDING**
- Critical for agent autonomy and expanding the knowledge base.
- The plugin's skills are how AI hosts discover Helios. `make-video` is the canonical entry skill.
- **Allowed work:** Creating new skills for uncovered domains, updating existing skills with new patterns, Keeping plugin manifests valid for every listed host.

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
- Includes the hosted Helios MCP endpoint for AI hosts that cannot run local servers.

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
