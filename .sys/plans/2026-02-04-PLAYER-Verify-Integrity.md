# Spec: Verify Player Integrity

## 1. Context & Goal
- **Objective**: Verify the stability and integrity of the `@helios-project/player` package by running all unit tests and end-to-end verification scripts.
- **Trigger**: Routine maintenance to confirm "Stable and Feature Complete" posture.
- **Impact**: Ensures no regressions have been introduced and confirms the domain is ready for V2 platform integration.

## 2. File Inventory
- **Create**: None
- **Modify**: `docs/status/PLAYER.md` (to update verification status)
- **Read-Only**: `packages/player/src/**/*`, `tests/e2e/**/*`

## 3. Implementation Spec
- **Architecture**: Verification only.
- **Pseudo-Code**:
  1. Build all workspaces (`core`, `renderer`, `player`).
  2. Run unit tests (`npm run test -w packages/player`).
  3. Build examples (`npm run build:examples`).
  4. Run E2E verification (`npx playwright install` then `ts-node tests/e2e/verify-player.ts`).
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run test -w packages/player && npx ts-node tests/e2e/verify-player.ts`
- **Success Criteria**: All tests pass, E2E script logs "✅ Player Verification Passed!".
- **Edge Cases**: None.
