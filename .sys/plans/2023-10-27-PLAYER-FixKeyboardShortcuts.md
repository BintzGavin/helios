#### 1. Context & Goal
- **Objective**: Fix the keyboard shortcuts for seeking: change `ArrowLeft`/`ArrowRight` to seek 1 frame (or 10 frames with `Shift`) and remove the `j` and `l` shortcuts.
- **Trigger**: The README and the in-player shortcuts help menu document that `←`/`→` seek 1 frame and `Shift + ←/→` seek 10 frames. However, the implementation seeks -5/+5 seconds (and -10/+10 seconds with `Shift`) and also binds `j` and `l` keys which are not documented.
- **Impact**: Brings the actual behavior of keyboard shortcuts in line with the documented vision and user expectations.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Change `case "ArrowRight":` to use `seekRelative(e.shiftKey ? 10 : 1)` instead of `seekRelativeSeconds(...)`.
  - Change `case "ArrowLeft":` to use `seekRelative(e.shiftKey ? -10 : -1)` instead of `seekRelativeSeconds(...)`.
  - Remove `case "j": case "J":`
  - Remove `case "l": case "L":`
- **Modify**: `packages/player/src/index.test.ts`
  - Update tests related to `ArrowLeft` and `ArrowRight` to expect 1 frame or 10 frames seeking.
- **Read-Only**: `packages/player/README.md`

#### 3. Implementation Spec
- **Architecture**: N/A, just a logic fix in the `handleKeydown` event handler.
- **Pseudo-Code**:
  ```javascript
  case "ArrowRight":
      this.seekRelative(e.shiftKey ? 10 : 1);
      break;
  case "ArrowLeft":
      this.seekRelative(e.shiftKey ? -10 : -1);
      break;
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, specifically the ones testing keyboard shortcuts for `ArrowLeft` and `ArrowRight`.
- **Edge Cases**: Verify that `Shift` modifier works correctly.
