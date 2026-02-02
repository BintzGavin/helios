# Plan: Document Excalidraw Example

## 1. Context & Goal
- **Objective**: Document the existing `examples/excalidraw-animation` directory in `examples/README.md` and `/.sys/llmdocs/context-demo.md`.
- **Trigger**: Discovery of an undocumented but fully functional example during `examples/` inventory scan.
- **Impact**: Unlocks visibility of the Excalidraw integration for users and agents, and ensures it is included in future verification cycles.

## 2. File Inventory
- **Modify**: `examples/README.md` (Add "excalidraw-animation" to Integrations list)
- **Modify**: `/.sys/llmdocs/context-demo.md` (Add "excalidraw-animation" to Integrations list)
- **Read-Only**: `examples/excalidraw-animation/` (Reference for description)

## 3. Implementation Spec
- **Architecture**: No code changes. Documentation update only.
- **Pseudo-Code**:
  - Open `examples/README.md`.
  - Locate "Integrations" section.
  - Insert `- **[excalidraw-animation](./excalidraw-animation/)**: Diagram animation with Excalidraw.`
  - Open `/.sys/llmdocs/context-demo.md`.
  - Locate "Integrations" section.
  - Insert `- **excalidraw-animation**: Diagram animation with Excalidraw.`

- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1. Run `npm run build:examples` to ensure the Excalidraw asset copying logic in `vite.build-example.config.js` still works.
  2. Run `npx tsx tests/e2e/verify-render.ts excalidraw` to verify the example renders correctly (implicit E2E test).
- **Success Criteria**:
  - `examples/README.md` contains the link to `excalidraw-animation`.
  - Build succeeds.
  - `verify-render.ts` outputs "✅ Excalidraw Animation Passed!".
- **Edge Cases**: None.
