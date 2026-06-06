# Plan: 2026-12-32-STUDIO-Improve-AudioMeter-Test-Coverage

## 1. Context & Goal
- **Objective**: Improve the unit test coverage for the `AudioMeter` component.
- **Trigger**: The component's unit test coverage is currently at ~83% branch coverage and needs improvement, specifically missing coverage on lines 20 and 32 (null reference guards) as shown by test coverage reports (`packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx`).
- **Impact**: Provides 100% test coverage for the `AudioMeter.tsx` component, assuring that defensive edge case logic holds.

## 2. File Inventory
- **Create**: None
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMeter.test.tsx`
- **Read-Only**: `packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx`

## 3. Implementation Spec
- **Architecture**: Unit testing using Vitest and React Testing Library. We will test the imperative handle logic when underlying ref nodes are null to fully exercise the branches on lines 20 and 32 of `AudioMeter.tsx`.
- **Pseudo-Code**:
  - Add a test that renders `AudioMeter`.
  - Save the `ref.current` object reference before unmounting the component.
  - Unmount the component, which sets the internal `leftRef.current` and `rightRef.current` to null.
  - Call the saved `update` method.
  - Verify that no errors are thrown during the `update` call with valid data when the DOM node refs are detached.
- **Public API Changes**: None
- **Dependencies**: None

## 4. Test Plan
- **Verification**: Run `npm run test -w packages/studio -- --coverage src/components/AudioMixerPanel/AudioMeter.test.tsx`
- **Success Criteria**: 100% statement and branch test coverage for `AudioMeter.tsx`, specifically confirming lines 20 and 32 are covered.
- **Edge Cases**: Component unmounting before an imperative handle update happens.
