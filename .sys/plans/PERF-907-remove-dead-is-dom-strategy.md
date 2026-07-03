---
id: PERF-907
slug: remove-dead-is-dom-strategy
status: complete
claimed_by: "jules"
created: 2024-07-03
completed: ""
result: ""
---
# PERF-907: Remove Dead `isDomStrategy` Code Blocks in Single-Worker Buffer Path

## Focus Area
`CaptureLoop.ts` - Single-worker fast paths (`isString` vs `!isString` branches).

## Background Research
Currently, inside the single-worker fallback path of `CaptureLoop.ts` (around lines 250 and 640), there is an `isString` variable calculated:
```typescript
isString = isDomStrategy || typeof buffer === "string";
```

Later on, the code unswitches the loop paths:
```typescript
if (isString) {
  if (isDomStrategy) {
     // DOM string loop
  } else {
     // Canvas string loop
  }
} else {
  if (isDomStrategy) {  // <--- UNREACHABLE !
     // DOM buffer loop
  } else {
     // Canvas buffer loop
  }
}
```

Because `isString` is intrinsically `true` whenever `isDomStrategy` is true, the entire `} else {` block (where `isString === false`) guarantees that `isDomStrategy` is false.
Thus, the `if (isDomStrategy)` check and its massive internal blocks (e.g. lines 461-532 and lines 846-905 in `CaptureLoop.ts`) inside the `!isString` branch are completely dead code that can never execute.

Removing hundreds of lines of dead code greatly simplifies the module, reduces V8 parser overhead, and shrinks the script payload, potentially allowing JIT optimization to operate on a simpler AST for the hot loops.

## Benchmark Configuration
- **Composition URL**: Any standard DOM composition
- **Render Settings**: Standard
- **Mode**: `dom` (single-worker path)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Dead code bloats the Javascript AST and reduces readability.

## Implementation Spec

### Step 1: Remove Dead `isDomStrategy` Branches in the Single-Worker Loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fallback paths (both under the `if (hasProcessFn)` block and the `else` block), locate the `} else {` branch of the `if (isString)` checks (around line 460 and line 845).

Delete the unreachable `if (isDomStrategy)` branch and its entire block, leaving only the inner `} else {` code (the canvas buffer loop).

For example:
```typescript
            } else {
              if (isDomStrategy) {
                 // ... DELETE THIS ENTIRE DEAD BLOCK ...
              } else {
                 let i = 1;
                 while (i < totalFrames - 1 && !aborted) {
                    // ... Keep this canvas buffer block ...
                 }
                 // ... Keep trailing code ...
              }
            }
```

Becomes:
```typescript
            } else {
               // We know isDomStrategy is false here!
               let i = 1;
               while (i < totalFrames - 1 && !aborted) {
                  // ... Keep this canvas buffer block ...
               }
               // ... Keep trailing code ...
            }
```

Apply this dead code removal twice (once in the `hasProcessFn` block, and once in the `!hasProcessFn` block).

**Why**: Code simplicity, readability, and a reduction in parser overhead for completely unreachable code branches.

## Variations
None.

## Canvas Smoke Test
Run `npx vitest run verify-canvas` to ensure the canvas path is untouched.

## Correctness Check
Run `npm test -w packages/renderer` to ensure no single-worker regressions occurred.
