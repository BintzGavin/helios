---
id: PERF-372
slug: restore-timedriver-promise
status: claimed
claimed_by: "executor-session"
created: 2024-05-01
completed: ""
result: ""
---

# PERF-372: Restore TimeDriver Promise

## Focus Area
`TimeDriver.setTime()` and `CaptureLoop.ts`.

## Background Research
PERF-368 changed `TimeDriver.setTime` to return `void` to eliminate Promise tracking overhead. However, this assumption proved flawed: if `Runtime.evaluate` uses `awaitPromise: true` and yields internally, subsequent commands (like `HeadlessExperimental.beginFrame`) process concurrently, leading to race conditions. PERF-372 restores awaited Promises to fix these race conditions.

## Baseline
- **Current best render time**: N/A (Regression fix)

## Implementation Spec

### Step 1: Update `TimeDriver.ts` Interface
**File**: `packages/renderer/src/drivers/TimeDriver.ts`
**What to change**: Update `setTime` to return `Promise<void>`.
**Why**: Ensure callers can `await` the completion of CDP operations.

### Step 2: Refactor `CdpTimeDriver.ts` and `SeekTimeDriver.ts`
**Files**: `packages/renderer/src/drivers/CdpTimeDriver.ts`, `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Change `setTime` to return `Promise<void>` and return the underlying async operations.
**Why**: Re-establishes sequential processing.

### Step 3: Update `CaptureLoop.ts`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Restore `await` logic for `timeDriver.setTime`.
**Why**: Fixes the race condition.
