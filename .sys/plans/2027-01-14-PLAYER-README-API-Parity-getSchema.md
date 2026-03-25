#### 1. Context & Goal
- **Objective**: Update `packages/player/README.md` to document the `getSchema` method implemented in `<helios-player>`.
- **Trigger**: The Journal and codebase indicate a "Standard Media API Parity Gap". The `getSchema` method is present in the `HeliosPlayer` class and tested in `api_parity.test.ts` but missing from the README documentation.
- **Impact**: Provides developers with complete and accurate documentation of the Web Component's API for retrieving the composition schema.

#### 2. File Inventory
- **Create**: [None]
- **Modify**: `packages/player/README.md` (Add `getSchema` to the Methods section).
- **Read-Only**: `packages/player/src/index.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation updates directly mapping existing `src/index.ts` class members to the markdown specifications.
- **Pseudo-Code**: In `### Methods`, append `- \`getSchema(): Promise<HeliosSchema | undefined>\` - Retrieves the input properties schema from the composition.`
- **Public API Changes**: No code changes; this is purely documentation parity.
- **Dependencies**: [None]

#### 4. Test Plan
- **Verification**: `cat packages/player/README.md | grep -i "getSchema"`
- **Success Criteria**: The output matches the newly added `getSchema` method, confirming its inclusion.
- **Edge Cases**: Ensure the formatting remains syntactically valid and does not break surrounding document structures.
