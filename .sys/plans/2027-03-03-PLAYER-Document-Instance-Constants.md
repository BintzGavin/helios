#### 1. Context & Goal
- **Objective**: Document the `HTMLMediaElement` instance and class constants in the README.
- **Trigger**: Vision gap identified. The README is missing documentation for standard `HTMLMediaElement` instance and class constants (like `HAVE_NOTHING`, `NETWORK_EMPTY`, etc.) which are already implemented in `<helios-player>`.
- **Impact**: Improves API documentation parity with the actual implementation and standard web APIs.

#### 2. File Inventory
- **Modify**: `README.md` (Add documentation for `HTMLMediaElement` constants)
- **Read-Only**: `packages/player/src/index.ts` (To verify implemented properties)

#### 3. Implementation Spec
- **Architecture**: Update the README file to include a new sub-section under the API documentation detailing the standard `HTMLMediaElement` class and instance constants (`HAVE_NOTHING`, `HAVE_METADATA`, `HAVE_CURRENT_DATA`, `HAVE_FUTURE_DATA`, `HAVE_ENOUGH_DATA`, `NETWORK_EMPTY`, `NETWORK_IDLE`, `NETWORK_LOADING`, `NETWORK_NO_SOURCE`).
- **Pseudo-Code**:
  - Locate the API Parity section in `README.md`.
  - Append the list of class and instance constants.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `cat README.md | grep -A 15 "### HTMLMediaElement Constants"`
- **Success Criteria**: The README contains the documented constants.
- **Edge Cases**: None.
