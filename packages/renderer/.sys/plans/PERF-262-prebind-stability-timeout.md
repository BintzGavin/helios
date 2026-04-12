---
id: PERF-262
slug: prebind-stability-timeout
status: complete
claimed_by: "executor"
---
# RENDERER: Prebind stability timeout executor

#### 1. Context & Goal
- **Objective**: In `packages/renderer/src/drivers/CdpTimeDriver.ts`, pre-binding the stability timeout promise executor to a class property avoids dynamically allocating an anonymous closure per-frame during the `setTime` hot loop, reducing V8 GC pressure (PERF-262).
- **Trigger**: Identified as an improvement opportunity.
- **Impact**: Reduces GC overhead, potentially improving the hot loop performance.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
