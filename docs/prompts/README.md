# AI Agent Prompts

This directory contains the complete prompts used to orchestrate the autonomous agent swarm that develops Helios Engine. These prompts are provided for transparency and educational purposes.

## Black Hole Architecture

An alternative to the "Ralph Loop" pattern. Instead of one agent retrying until it works, Black Hole Architecture uses a team of specialized agents that cycle through phases in planning -> execution loops. They compare what exists to what's planned and what's in the long-term vision and find the gaps, and continuously pull the codebase toward that long-term vision.

My implementation here operates on a **2-hour continuous loop** with two distinct phases, each with specialized agents and responsibilities:

### Phase 1: Planning (1 hour)
Five planning agents (one per domain: CORE, RENDERER, PLAYER, DEMO, STUDIO) compare the codebase to the vision in `README.md`, find what's missing, and write up plans for what needs to be built.

### Phase 2: Execution & Self-Documentation (1 hour)
Five execution agents read those plans and write the actual code. Each stays in their own domain, tests their work, logs what they completed, and updates all relevant documentation (progress logs, context files, backlog, system context) immediately upon completion.

### Daily: Comprehensive Documentation Review
The DOCS agent (unified planning/execution) runs **once per day** to perform a comprehensive review and update of all user-facing documentation in a Mintlify-like structure. It identifies gaps, updates API docs, syncs changelogs, documents examples, and ensures the entire documentation site is accurate and synchronized with the codebase.

**Cycle**: Planning (1h) → Execution (1h) → Planning (1h) → Execution (1h) → ... (continuous loop)
**Documentation**: DOCS runs once daily for comprehensive review

## Scheduling & Autonomy

**Current Implementation**: 2-hour continuous loop (1 hour planning, 1 hour execution, repeat immediately). This provides rapid iteration while maintaining separation of concerns. Tasks may span multiple cycles if needed—executors can continue work from previous cycles.

**Cycle Timing**: The 2-hour window (1h planning, 1h execution) provides natural separation to avoid conflicts. Planning completes before execution begins, and execution completes before the next planning cycle starts.

**Infrastructure**: All scheduling is handled through the [Jules website dashboard](https://jules.ai). Tasks are scheduled in 1-hour blocks—planning tasks run first, then execution tasks, then repeat. The DOCS agent runs once per day for comprehensive documentation review. The Ultra plan allows up to 300 tasks per day, which supports ~12 cycles per day (24 hours / 2 hours per cycle) plus daily documentation review.

Alternatively, tasks can be triggered via the Jules CLI for programmatic orchestration, enabling fully autonomous loops without manual scheduling. 

Alternatively, tasks can be triggered via the Jules CLI instead of only through the web dashboard. This opens up the possibility of implementing a more traditional loop—similar to the "Ralph Loop" or Claude Code approaches, but by programmatically orchestrating cycles without manual intervention. It would be interesting to compare the operational costs and efficiency of this Jules CLI/cloud-driven method versus a Claude Code–powered workflow where code updates and tests are locally executed.

## Prompt Structure

The system uses individual prompts for each agent role:

**Planning Prompts:**
- **[CORE Planning](./planning-core.md)** - Planning agent for core logic engine
- **[RENDERER Planning](./planning-renderer.md)** - Planning agent for rendering pipeline
- **[PLAYER Planning](./planning-player.md)** - Planning agent for Web Component player
- **[DEMO Planning](./planning-demo.md)** - Planning agent for examples and build tooling
- **[STUDIO Planning](./planning-studio.md)** - Planning agent for Helios Studio dev environment

**Execution Prompts:**
- **[CORE Execution](./execution-core.md)** - Execution agent for core logic engine
- **[RENDERER Execution](./execution-renderer.md)** - Execution agent for rendering pipeline
- **[PLAYER Execution](./execution-player.md)** - Execution agent for Web Component player
- **[DEMO Execution](./execution-demo.md)** - Execution agent for examples and build tooling
- **[STUDIO Execution](./execution-studio.md)** - Execution agent for Helios Studio dev environment

**Other Prompts:**
- **[Documentation Prompt](./docs.md)** - Unified prompt for documentation agent (no planning/execution separation)
- **[Role Definitions](./roles.md)** - Domain-specific role configurations (reference only)

**Note**: 
- Each agent has its own dedicated planning and execution prompt files with role definitions embedded directly (no template variables).
- Execution agents (CORE/RENDERER/PLAYER/DEMO/STUDIO) update progress logs, context files, backlog, and system context immediately upon completing work, eliminating the need for a separate scribe agent.
- The DOCS agent runs **once per day** to perform a comprehensive review and update of all documentation, ensuring the entire documentation site stays synchronized with the codebase.
- Each role maintains its own semantic version (e.g., CORE: 1.2.3, DOCS: 2.1.0) instead of using timestamps, which are unreliable in agent workflows.

## Design Principles

**Separation of Concerns**: Planners plan, executors code. No mixing—keeps things organized.

**Domain Isolation**: Each agent owns their own area. No stepping on toes, everyone works in parallel.

**Self-Bootstrapping**: Agents create what they need if it's missing. The system sets itself up.

**Vision-Driven Development**: When there's no backlog, planners compare code to `README.md` and figure out what to build next.

**Context Engineering**: Execution agents maintain clean summaries of how things connect in their domain, updating context files immediately after completing work. This keeps documentation current and makes planning faster.

**Objective:** The goal of this project is to benchmark the capabilities of an autonomous agent fleet. We are testing the extent to which AI agents can self-organize, maintain a coherent architecture, and evolve a complex system from a vision document into a production-grade product with minimal human intervention.

