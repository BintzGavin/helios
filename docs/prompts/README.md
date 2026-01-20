# AI Agent Prompts

This directory contains the complete prompts used to orchestrate the autonomous agent swarm that develops Helios Engine. These prompts are provided for full transparency and educational purposes.

## Overview

The Helios Swarm System operates on a daily cycle with three main phases:

1. **Morning Phase**: Planning agents analyze the codebase and generate implementation plans
2. **Afternoon Phase**: Execution agents implement the planned tasks
3. **End-of-Day Phase**: Scribe agent consolidates progress and regenerates the context knowledge base

## Prompt Files

- **[Planning Prompt](./planning.md)** - The morning cycle prompt template used by planning agents
- **[Execution Prompt](./execution.md)** - The afternoon cycle prompt template used by execution agents
- **[Scribe Prompt](./scribe.md)** - The end-of-day prompt for consolidating progress and maintaining documentation
- **[Role Definitions](./roles.md)** - Role-specific definitions for each agent type (CORE, RENDERER, PLAYER, DEMO)

## How to Use

1. **Morning**: Copy the Planning Prompt + the relevant Role Definition into the agent context
2. **Afternoon**: Copy the Execution Prompt + the relevant Role Definition into the agent context
3. **End-of-Day**: Copy the Scribe Prompt into the agent context (no role definition needed)

The prompts use `{{ROLE_DEFINITION}}` as a placeholder that should be replaced with the appropriate role definition from `roles.md`.

## What These Prompts Demonstrate

These prompts demonstrate how the agents are instructed to bootstrap the system, analyze the codebase, generate implementation plans, and execute work while maintaining isolation and avoiding conflicts.

**Objective:** The goal of this project is to benchmark the capabilities of an autonomous agent fleet. We are testing the extent to which AI agents can self-organize, maintain a coherent architecture, and evolve a complex system from a vision document into a production-grade product with minimal human intervention.

