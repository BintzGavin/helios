#### 1. Context & Goal
- **Objective**: Implement the missing `getStartDate` API parity method.
- **Trigger**: The HTMLMediaElement interface provides `getStartDate()` (which returns a `Date` object or `NaN` if not applicable). Our player lacks `getStartDate`.
- **Impact**: Brings the Web Component closer to complete HTMLMediaElement parity, supporting wrappers or libraries that expect standard properties.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add `getStartDate` method.
  - `packages/player/README.md`: Document `getStartDate`.
  - `packages/player/src/api_parity.test.ts`: Add test case for `getStartDate`.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Add `getStartDate()` to `HeliosPlayer` returning `NaN` (standard behavior for media without a valid start date timeline, like regular MP4s/videos).
- **Pseudo-Code**:
  ```text
  Define getStartDate method
    Return NaN
  ```
- **Public API Changes**: Adds `getStartDate` method to the Web Component.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: The tests should pass and confirm `getStartDate` is present and returns `NaN`.
- **Edge Cases**: None.
