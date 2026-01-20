# AI Agent Prompts

This directory contains the complete prompts used to orchestrate the autonomous agent swarm that develops Helios Engine. These prompts are provided for full transparency and educational purposes.

## Black Hole Architecture

An alternative to the "Ralph Loop" pattern. Instead of one agent retrying until it works, Black Hole Architecture uses a team of specialized agents that cycle through phases in planning -> execution loops. They compare what exists to what's planned and what's in the long-term vision and find the gaps, and continuously pull the codebase toward that long-term vision.

My implementation here operates on a daily cycle with three distinct phases, each with specialized agents and responsibilities:

### Morning Phase: Planning
Four planning agents (one per domain: CORE, RENDERER, PLAYER, DEMO) compare the codebase to the vision in `README.md`, find what's missing, and write up plans for what needs to be built.

### Afternoon Phase: Execution
Four execution agents read those plans and write the actual code. Each stays in their own domain, tests their work, and logs what they completed.

### End-of-Day Phase: Scribe
One scribe agent gathers everyone's progress, updates the project history, and refreshes the knowledge base that planning agents use the next day.

## Scheduling & Autonomy

**Current Implementation**: I'm running one complete cycle (planning → execution → scribe) per day, which gives me time to review and merge PRs. This is still a human-in-the-loop setup where I'm at least rubber-stamping changes.

**True Autonomy**: The loop could be condensed to have zero idle time between cycles—as soon as scribe finishes, planning starts again. As soon as planning finishes, execution starts again. And the same with the scribe (which is essentially a safeguard to ensure against out of date context before planning starts again). This would make it fully autonomous with no human review bottleneck.

**Infrastructure**: All scheduling is handled through the [Jules website dashboard](https://jules.ai) (Google's Ultra plan). No custom infrastructure needed. The Ultra plan allows up to 300 tasks per day, which is more than enough for multiple cycles. Tasks are scheduled directly through their web interface—morning planning tasks, afternoon execution tasks, and end-of-day scribe tasks. 

Alternatively, tasks can be triggered via the Jules CLI instead of only through the web dashboard. This opens up the possibility of implementing a more traditional loop—similar to the "Ralph Loop" or Claude Code approaches, but by programmatically orchestrating cycles without manual intervention. It would be interesting to compare the operational costs and efficiency of this Jules CLI/cloud-driven method versus a Claude Code–powered workflow where code updates and tests are locally executed.

## Prompt Structure

The system uses template-based prompts with role-specific definitions:

- **[Planning Prompt](./planning.md)** - Template for morning cycle planning agents
- **[Execution Prompt](./execution.md)** - Template for afternoon cycle execution agents
- **[Scribe Prompt](./scribe.md)** - Template for end-of-day consolidation and documentation
- **[Role Definitions](./roles.md)** - Domain-specific role configurations (CORE, RENDERER, PLAYER, DEMO)

Each prompt template uses `{{ROLE_DEFINITION}}` as a placeholder that is replaced with the appropriate role definition, allowing the same prompt structure to be specialized for different domains.

## Design Principles

**Separation of Concerns**: Planners plan, executors code. No mixing—keeps things organized.

**Domain Isolation**: Each agent owns their own area. No stepping on toes, everyone works in parallel.

**Self-Bootstrapping**: Agents create what they need if it's missing. The system sets itself up.

**Vision-Driven Development**: When there's no backlog, planners compare code to `README.md` and figure out what to build next.

**Context Engineering**: The scribe keeps a clean summary of how things connect, not every detail. Makes planning faster.

**Objective:** The goal of this project is to benchmark the capabilities of an autonomous agent fleet. We are testing the extent to which AI agents can self-organize, maintain a coherent architecture, and evolve a complex system from a vision document into a production-grade product with minimal human intervention.

