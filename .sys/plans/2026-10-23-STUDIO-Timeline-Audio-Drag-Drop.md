#### 1. Context & Goal
- **Objective**: Enable dropping audio assets onto the Timeline and gracefully map them to composition inputs.
- **Trigger**: The Studio UI requires seamless integration of audio assets alongside video components.
- **Impact**: Resolves a missing link in dragging an audio asset to specific time inputs.

#### 2. File Inventory
- **Create**: None.
- **Modify**: packages/studio/src/components/Timeline.tsx (Update handleDrop and handleDragOver to accept audio and attach correctly to timeProps)
- **Modify**: packages/studio/src/components/Timeline.test.tsx (Add/update tests verifying audio drag & drop)
- **Read-Only**: None.

#### 3. Implementation Spec
- **Architecture**: React event handling on Timeline area leveraging DragEvent to match dragged payload to schema inputs.
- **Pseudo-Code**: In handleDrop, extract target payload, verify it's an audio or video asset, and find time property by looking for key with suffix 'Time' or strictly matching type to update inputProps accordingly via controller.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: npm run test -w packages/studio -- src/components/Timeline.test.tsx
- **Success Criteria**: Timeline tests pass, dropping an audio mock triggers setInputProps correctly.
- **Edge Cases**: Dropping non-assets, dropping when schema misses a time prop.
