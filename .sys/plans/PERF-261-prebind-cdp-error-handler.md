---
id: PERF-261
title: "Pre-bind setVirtualTimePolicy error handler to class property"
status: complete
---

## 1. Context & Goal

In `packages/renderer/src/drivers/CdpTimeDriver.ts`, inside the hot loop `setTime`, we call:

```typescript
      this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams).catch((err) => {
        if (this.cdpReject) {
          this.cdpReject(err);
          this.cdpResolve = null;
          this.cdpReject = null;
        }
      });
```

The arrow function passed to `.catch()` is newly allocated on every frame. Pre-binding it as a class property (`this.handleVirtualTimeBudgetError`) should reduce GC pressure and execution overhead by eliminating this closure allocation.

## 2. File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

## 3. Implementation Spec

```typescript
// Add as a class property
private handleVirtualTimeBudgetError = (err: any) => {
  if (this.cdpReject) {
    this.cdpReject(err);
    this.cdpResolve = null;
    this.cdpReject = null;
  }
};

// ... inside setTime ...
      this.client!.send('Emulation.setVirtualTimePolicy', this.setVirtualTimePolicyParams)
          .catch(this.handleVirtualTimeBudgetError);
```
