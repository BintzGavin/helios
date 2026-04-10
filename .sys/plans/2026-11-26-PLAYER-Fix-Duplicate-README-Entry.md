#### 1. Context & Goal
- **Objective**: Remove the duplicated `getSchema` documentation from the `README.md`.
- **Trigger**: The method `getSchema` is listed twice consecutively in the `README.md` file.
- **Impact**: Improves documentation readability and accuracy by removing duplicate entries.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md`
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Plaintext markdown updates.
- **Pseudo-Code**:
  - Open `packages/player/README.md`
  - Locate the `### Methods` section.
  - Find the duplicate lines:
    ```markdown
    - `getSchema(): Promise<HeliosSchema | undefined>` - Retrieves the input properties schema from the composition.
    - `getSchema(): Promise<HeliosSchema | undefined>` - Retrieves the input properties schema from the composition.
    ```
  - Remove one of the lines so only one instance remains.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `grep -c "getSchema(): Promise<HeliosSchema" packages/player/README.md`
- **Success Criteria**: The output is exactly 1.
- **Edge Cases**: None.
