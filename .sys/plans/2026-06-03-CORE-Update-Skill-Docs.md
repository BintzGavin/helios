#### 1. Context & Goal
- **Objective**: Update `.agents/skills/helios/core/SKILL.md` to accurately reflect the v3.3.0 Core API surface.
- **Trigger**: Vision analysis revealed outdated function signatures (`createSystemPrompt`), incomplete types (`DiagnosticReport`), and missing features (`stagger`, `shift`) in the agent documentation, creating a gap in "Agent Experience First".
- **Impact**: Prevents AI agents (including future planner/executor agents) from hallucinating incorrect API usage, ensuring generated code works with the current codebase.

#### 2. File Inventory
- **Create**: None
- **Modify**: `.agents/skills/helios/core/SKILL.md` (Update API Reference sections)
- **Read-Only**:
  - `packages/core/src/index.ts`
  - `packages/core/src/ai.ts`
  - `packages/core/src/sequencing.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation sync. Update the Markdown skill file to match the TypeScript source of truth.
- **Pseudo-Code**:
  1. **Update `createSystemPrompt`**:
     - Change example from `createSystemPrompt(helios, "prompt")` to `createSystemPrompt(helios)`.
     - Update description to reflect that it generates a base prompt + context, without accepting a user prompt argument.
  2. **Update `DiagnosticReport`**:
     - Add fields: `webgl`, `webgl2`, `webAudio` (boolean).
     - Add field: `colorGamut` ('srgb' | 'p3' | 'rec2020' | null).
     - Add fields: `videoCodecs`, `audioCodecs`, `videoDecoders`, `audioDecoders` (record of booleans).
  3. **Add Sequencing Helpers**:
     - Under "Animation Helpers" or a new "Sequencing" section, add documentation for `stagger` and `shift`.
     - Example for `stagger`: `stagger(items, 5)` -> item[i].from = i * 5.
     - Example for `shift`: `shift(items, 30)` -> item.from += 30.
- **Public API Changes**: None (Documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `cat .agents/skills/helios/core/SKILL.md` to display the file content.
- **Success Criteria**:
  - `createSystemPrompt` usage shows exactly 1 argument.
  - `DiagnosticReport` interface lists `videoDecoders` and `audioDecoders`.
  - `stagger` and `shift` are documented with code examples.
- **Edge Cases**: Verify that the JSON structure in `DiagnosticReport` examples matches the nested object structure defined in `index.ts`.
