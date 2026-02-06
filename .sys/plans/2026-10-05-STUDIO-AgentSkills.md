# Context & Goal
- **Objective**: Integrate "Agent Skills" documentation into the Studio Assistant to improve AI-assisted development context.
- **Trigger**: The `README.md` defines "Agent Experience First" as a core principle and lists `SKILL.md` files as key resources for agents. Currently, the Studio Assistant only ingests `README.md` files, ignoring the specialized `SKILL.md` guides located in `.agents/skills/`.
- **Impact**: This will allow the "Ask AI" feature in Studio to provide better, pattern-aware answers by referencing the authoritative "skills" defined for Helios, bridging the gap between the "Agent Experience" vision and the tool's capabilities.

# File Inventory
- **Modify**: `packages/studio/src/server/documentation.ts` (Implement logic to resolve and read `SKILL.md` files)
- **Read-Only**: `.agents/skills/helios/` (Source of truth for skills)

# Implementation Spec
- **Architecture**:
  - Extend the existing `findDocumentation` function in the Studio backend (`documentation.ts`) to scan the `.agents/skills/helios/` directory (if it exists) in addition to package READMEs.
  - Map the skills to the corresponding package scope (e.g., `core/SKILL.md` -> `core` package docs).
  - The Assistant UI (`AssistantModal.tsx`) already consumes the `/api/documentation` endpoint, so no UI changes should be needed if the data shape is consistent.

- **Pseudo-Code**:
  ```typescript
  // In packages/studio/src/server/documentation.ts

  function findSkills(rootDir: string): DocSection[] {
     // 1. Locate .agents/skills/helios directory relative to rootDir
     //    (Handle monorepo structure: ../../.agents/skills/helios)

     // 2. Iterate through known packages ['core', 'renderer', 'player', 'studio']

     // 3. Check for SKILL.md in each subdirectory

     // 4. If found, parse markdown and add to DocSections with:
     //    title: "Agent Skill: [Package]"
     //    package: [pkgName]
     //    content: [file content]

     // 5. Return list of sections
  }

  // Update findDocumentation to include findSkills() result
  ```

- **Public API Changes**: None (Internal API `/api/documentation` response will include more entries).

- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio` (or `npm run dev` in studio package).
  2. Open the "Helios Assistant" (✨ button).
  3. Go to "Documentation" tab.
  4. Search for "Skill" or specific content known to be in a `SKILL.md` file (e.g., "Core API patterns").
  5. Verify that the skill content appears in the list and can be expanded.
  6. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
- **Success Criteria**: The Assistant documentation list includes entries sourced from `.agents/skills/helios/*/SKILL.md`.
- **Edge Cases**:
  - `.agents` directory missing (production/npm install) -> Should gracefully return empty list for skills (no crash).
  - `SKILL.md` file missing for a specific package -> Skip without error.
