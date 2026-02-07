# Context & Goal
- **Objective**: Update the E2E verification script to support SVG icons and fix assertion failures.
- **Trigger**: The current script `tests/e2e/verify-player.ts` fails because it expects text content (emojis like '🔊') which were replaced by SVG icons in v0.74.1.
- **Impact**: Restores automated verification capability for the Player domain, enabling reliable self-driving development and ensuring maintenance stability.

# File Inventory
- **Modify**: `tests/e2e/verify-player.ts` (Update assertions to use `aria-label` instead of text content)
- **Read-Only**: `tests/e2e/fixtures/mock-composition.html`, `packages/player/src/index.ts`

# Implementation Spec
- **Architecture**:
  - The verification script uses Playwright to interact with a static HTML fixture (`tests/e2e/fixtures/player.html`) served by a minimal Node.js HTTP server.
  - The script asserts the state of the player by inspecting DOM attributes.
- **Verification Logic Changes**:
  - Replace `await volumeBtn.textContent()` checks with `await volumeBtn.getAttribute('aria-label')`.
  - Verify that the mute button toggles between "Mute" and "Unmute".
  - Verify that the play button has the correct `aria-label` ("Play" / "Pause").
  - Remove dependency on emoji characters in assertions.
- **Dependencies**:
  - Ensure `@playwright/test` is available.

# Test Plan
- **Verification**: Run `npx tsx tests/e2e/verify-player.ts`.
- **Success Criteria**: The script outputs "🎉 All Player Verification Tests Passed!" without errors.
- **Edge Cases**: Verify that the script handles the initial loading state correctly (where icons might be different or loading).
